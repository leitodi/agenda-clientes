const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const MAX_IMAGE_DIMENSION = 1280;
const TARGET_IMAGE_BYTES = 950 * 1024;
const MIN_IMAGE_DIMENSION = 640;
const MIN_JPEG_QUALITY = 0.5;
const MAX_FALLBACK_FILE_BYTES = 6 * 1024 * 1024;
const OPENING_MINUTES = 10 * 60;
const CLOSING_MINUTES = 22 * 60;

const state = {
    token: localStorage.getItem('agendaToken') || null,
    user: JSON.parse(localStorage.getItem('agendaUser') || 'null'),
    servicios: {
        corte: { label: 'Corte', durationMinutes: 30 },
        corte_barba: { label: 'Corte + barba', durationMinutes: 45 }
    },
    peluqueros: [],
    turnos: [],
    turnosDelMomento: [],
    clientes: [],
    serviciosCaja: [],
    selectedClienteId: null,
    selectedTurnoClienteId: null,
    selectedCumpleDate: null,
    currentCumpleMonth: null,
    pendingTurnoPayload: null,
    pendingTurnoClienteNombre: '',
    atenciones: [],
    usuarios: []
};

let turnosAhoraIntervalId = null;
let loadingRequests = 0;
let loadingTimerId = null;
const turnosAlertados = new Set();

const $ = (id) => document.getElementById(id);

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function today() {
    return getLocalDateString();
}

function isAgendaRole() {
    return state.user?.role === 'agenda';
}

function isAdminRole() {
    return state.user?.role === 'admin';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeDigits(value) {
    return String(value || '').replace(/\D/g, '').trim();
}

function getCurrentMinutesLocal() {
    const now = new Date();
    return (now.getHours() * 60) + now.getMinutes();
}

function getTurnoEstado(turno) {
    return String(turno?.estado || 'pendiente').trim().toLowerCase();
}

function getTurnoEstadoLabel(estado) {
    if (estado === 'atendido') {
        return 'Atendido';
    }

    if (estado === 'perdido') {
        return 'Perdido';
    }

    return 'Pendiente';
}

function getTurnoEstadoClass(estado) {
    if (estado === 'atendido') {
        return 'status-ok';
    }

    if (estado === 'perdido') {
        return 'status-lost';
    }

    return 'status-pending';
}

function isTurnoDelMomento(turno, fechaActual = getLocalDateString(), minutosActuales = getCurrentMinutesLocal()) {
    return (
        getTurnoEstado(turno) === 'pendiente'
        && String(turno?.fecha || '') === fechaActual
        && Number(turno?.inicioMinutos) <= minutosActuales
        && Number(turno?.finMinutos) > minutosActuales
    );
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function parseTimeToMinutesLocal(time) {
    if (!/^\d{2}:\d{2}$/.test(String(time || ''))) {
        throw new Error('Hora invalida');
    }

    const [hour, minute] = String(time).split(':').map(Number);
    return (hour * 60) + minute;
}

function minutesToClock(totalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getDayOfWeekLocal(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Fecha invalida');
    }
    return date.getDay();
}

function isOpenDay(dateString) {
    if (!dateString) {
        return false;
    }
    return getDayOfWeekLocal(dateString) !== 0;
}

function validarRangoReportes(desde, hasta) {
    if (!desde || !hasta) {
        throw new Error('Debes seleccionar fecha desde y hasta');
    }

    const from = new Date(`${desde}T00:00:00`);
    const to = new Date(`${hasta}T00:00:00`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new Error('Fechas invalidas para reportes');
    }

    if (from > to) {
        throw new Error('La fecha desde no puede ser mayor que la fecha hasta');
    }

    const diffDays = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (diffDays > 31) {
        throw new Error('El rango maximo permitido es 1 mes (31 dias)');
    }
}

function getServiceDurationMinutes(servicio) {
    const servicioCaja = state.serviciosCaja.find((item) => item._id === servicio);
    if (servicioCaja) {
        return Number(servicioCaja.duracionMinutos || 30);
    }

    return Number(state.servicios[servicio]?.durationMinutes || 30);
}

function getServicioTurnoLabel(turno) {
    if (turno?.servicioNombre) {
        return turno.servicioNombre;
    }

    if (turno?.servicioId?.nombre) {
        return turno.servicioId.nombre;
    }

    const servicioCaja = state.serviciosCaja.find((item) => item._id === turno?.servicio);
    if (servicioCaja) {
        return servicioCaja.nombre;
    }

    return state.servicios[turno?.servicio]?.label || turno?.servicio || '-';
}

function getTurnoLastStartMinutes() {
    const servicio = $('turnoServicio')?.value || '';
    const duration = getServiceDurationMinutes(servicio);
    return CLOSING_MINUTES - duration;
}

function applyTurnoDateTimeConstraints() {
    const horaInput = $('turnoHora');
    const maxStartMinutes = getTurnoLastStartMinutes();

    horaInput.min = '10:00';
    horaInput.max = minutesToClock(maxStartMinutes);
    horaInput.step = '900';

    if (horaInput.value) {
        const valueMinutes = parseTimeToMinutesLocal(horaInput.value);
        if (valueMinutes < OPENING_MINUTES || valueMinutes > maxStartMinutes) {
            horaInput.value = '';
        }
    }
}

function nextOpenDate(baseDateString) {
    const baseDate = baseDateString ? new Date(`${baseDateString}T00:00:00`) : new Date();
    const result = new Date(baseDate);

    while (result.getDay() === 0) {
        result.setDate(result.getDate() + 1);
    }

    return result.toISOString().slice(0, 10);
}

function getMondayDateString(baseDateString) {
    const baseDate = baseDateString ? new Date(`${baseDateString}T00:00:00`) : new Date();
    const monday = new Date(baseDate);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    return monday.toISOString().slice(0, 10);
}

function showMessage(message, type = 'success') {
    const box = $('appMessage');
    const text = $('appMessageText');

    if (text) {
        text.textContent = message;
    } else {
        box.textContent = message;
    }

    box.className = `message ${type}`;
    box.classList.remove('hidden');
}

function hideMessage() {
    const box = $('appMessage');
    box.classList.add('hidden');
}

function showLoading(text = 'Cargando...') {
    const overlay = $('appLoading');
    const label = $('appLoadingText');

    loadingRequests += 1;
    if (label) {
        label.textContent = text;
    }

    if (loadingRequests > 1 || loadingTimerId) {
        return;
    }

    loadingTimerId = window.setTimeout(() => {
        if (loadingRequests > 0) {
            overlay.classList.remove('hidden');
        }
        loadingTimerId = null;
    }, 150);
}

function hideLoading() {
    const overlay = $('appLoading');
    loadingRequests = Math.max(0, loadingRequests - 1);

    if (loadingRequests > 0) {
        return;
    }

    if (loadingTimerId) {
        clearTimeout(loadingTimerId);
        loadingTimerId = null;
    }

    overlay.classList.add('hidden');
}

async function apiFetch(url, options = {}) {
    const {
        auth = true,
        method = 'GET',
        body,
        headers = {},
        showLoading: shouldShowLoading = true,
        loadingText = 'Cargando...'
    } = options;

    const requestHeaders = {
        ...headers
    };

    if (body !== undefined && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    if (auth && state.token) {
        requestHeaders.Authorization = `Bearer ${state.token}`;
    }

    if (shouldShowLoading) {
        showLoading(loadingText);
    }

    try {
        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }

        if (!response.ok) {
            throw new Error(payload?.error || 'Error en la solicitud');
        }

        return payload;
    } finally {
        if (shouldShowLoading) {
            hideLoading();
        }
    }
}

async function downloadFile(url, fallbackName) {
    const headers = {};
    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    showLoading('Preparando descarga...');

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            let payload = null;
            try {
                payload = await response.json();
            } catch (error) {
                payload = null;
            }
            throw new Error(payload?.error || 'No se pudo descargar el archivo');
        }

        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
        const fileName = match?.[1] || fallbackName;

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
    } finally {
        hideLoading();
    }
}

function applyRoleVisibility() {
    const isAdmin = isAdminRole();
    const isAgenda = isAgendaRole();

    document.querySelectorAll('.admin-only').forEach((element) => {
        element.classList.toggle('hidden', !isAdmin);
    });

    document.querySelectorAll('.restricted-agenda').forEach((element) => {
        element.classList.toggle('hidden', isAgenda);
    });

    if (isAgenda) {
        setTab('turnos');
        return;
    }

    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn && activeBtn.classList.contains('hidden')) {
        setTab('dashboard');
    }
}

function setTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        if (btn.classList.contains('hidden')) {
            btn.classList.remove('active');
            return;
        }

        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
        const isRestrictedForAgenda = isAgendaRole() && panel.classList.contains('restricted-agenda');
        panel.classList.toggle('hidden', panel.id !== `tab-${tabName}` || isRestrictedForAgenda);
    });
}

function scheduleToText(agenda) {
    return agenda
        .slice()
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((slot) => `${DAY_NAMES[slot.dayOfWeek]} ${slot.start}-${slot.end}`)
        .join(', ');
}

function completarSelectPeluqueros() {
    const activos = state.peluqueros
        .filter((p) => p.activo)
        .map((p) => ({ id: p._id, nombre: p.nombre }));

    const options = ['<option value="">Sin asignar</option>']
        .concat(activos
        .map((p) => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`)
        ).join('');

    const turnoPeluqueroSelect = $('turnoPeluquero');
    if (turnoPeluqueroSelect) {
        turnoPeluqueroSelect.innerHTML = options;
    }

    const cajaPeluqueroSelect = $('cajaPeluquero');
    if (cajaPeluqueroSelect) {
        cajaPeluqueroSelect.innerHTML = options;
    }

    const filtro = $('turnosFiltroPeluquero');
    const current = filtro.value;
    const filtroOptions = ['<option value="">Todos</option>']
        .concat(activos.map((p) => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`))
        .join('');
    filtro.innerHTML = filtroOptions;

    if (current && activos.some((p) => p.id === current)) {
        filtro.value = current;
    }

    const reportePeluqueroSelect = $('reportePeluquero');
    if (reportePeluqueroSelect) {
        const currentReport = reportePeluqueroSelect.value;
        const reportOptions = ['<option value="">Todos</option>']
            .concat(activos.map((p) => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`))
            .join('');
        reportePeluqueroSelect.innerHTML = reportOptions;

        if (currentReport && activos.some((p) => p.id === currentReport)) {
            reportePeluqueroSelect.value = currentReport;
        }
    }
}

function syncCajaMontoByServicio() {
    const servicioId = $('cajaServicio')?.value || '';
    const servicio = state.serviciosCaja.find((item) => item._id === servicioId);
    $('cajaMonto').value = servicio ? Number(servicio.precio).toFixed(2) : '';
}

function renderCajaServiciosSelect() {
    const select = $('cajaServicio');
    if (!select) {
        return;
    }

    if (!state.serviciosCaja.length) {
        select.innerHTML = '<option value="">Sin servicios disponibles</option>';
        select.value = '';
        $('cajaMonto').value = '';
        return;
    }

    const options = state.serviciosCaja
        .map((servicio) => (
            `<option value="${servicio._id}">${escapeHtml(servicio.nombre)}</option>`
        ))
        .join('');

    const current = select.value;
    select.innerHTML = options;

    if (current && state.serviciosCaja.some((item) => item._id === current)) {
        select.value = current;
    } else {
        select.value = state.serviciosCaja[0]._id;
    }

    syncCajaMontoByServicio();
}

function renderTurnoServiciosSelect() {
    const select = $('turnoServicio');
    if (!select) {
        return;
    }

    if (!state.serviciosCaja.length) {
        select.innerHTML = '<option value="">Sin servicios disponibles</option>';
        select.value = '';
        applyTurnoDateTimeConstraints();
        return;
    }

    const current = select.value;
    select.innerHTML = state.serviciosCaja.map((servicio) => (
        `<option value="${servicio._id}">${escapeHtml(servicio.nombre)} (${Number(servicio.duracionMinutos || 30)} min)</option>`
    )).join('');

    if (current && state.serviciosCaja.some((item) => item._id === current)) {
        select.value = current;
    } else {
        select.value = state.serviciosCaja[0]._id;
    }

    applyTurnoDateTimeConstraints();
}

function renderPeluquerosTable() {
    const body = $('peluquerosTableBody');

    body.innerHTML = state.peluqueros.map((p) => `
        <tr>
            <td>${escapeHtml(p.nombre)}</td>
            <td>${escapeHtml(p.telefono || '-')}</td>
            <td>${escapeHtml(p.fechaCumpleanos ? formatDateLabel(p.fechaCumpleanos) : '-')}</td>
            <td>${p.porcentajeComision}%</td>
            <td>${escapeHtml(scheduleToText(p.agenda))}</td>
            <td>${p.activo ? 'Si' : 'No'}</td>
            <td>
                <div class="row-actions">
                    <button class="btn" type="button" data-action="edit-peluquero" data-id="${p._id}">Editar</button>
                    <button class="btn danger" type="button" data-action="delete-peluquero" data-id="${p._id}">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderServiciosTable() {
    const body = $('serviciosTableBody');
    if (!body) {
        return;
    }

    if (!state.serviciosCaja.length) {
        body.innerHTML = '<tr><td colspan="4">No hay servicios cargados.</td></tr>';
        return;
    }

    body.innerHTML = state.serviciosCaja.map((servicio) => `
        <tr>
            <td>${escapeHtml(servicio.nombre)}</td>
            <td>$${formatCurrency(servicio.precio)}</td>
            <td>${Number(servicio.duracionMinutos || 30)} min</td>
            <td>
                <div class="row-actions">
                    <button class="btn" type="button" data-action="edit-servicio" data-id="${servicio._id}">Editar</button>
                    <button class="btn danger" type="button" data-action="delete-servicio" data-id="${servicio._id}">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderTurnoActionButtons(turno, includeDelete = false) {
    const estado = getTurnoEstado(turno);
    const buttons = [];

    if (estado === 'pendiente') {
        buttons.push(
            `<button class="btn primary" type="button" data-action="mark-turno-status" data-id="${turno._id}" data-status="atendido">Atendido</button>`
        );
        buttons.push(
            `<button class="btn danger" type="button" data-action="mark-turno-status" data-id="${turno._id}" data-status="perdido">Perdido</button>`
        );
    } else {
        buttons.push(
            `<button class="btn" type="button" data-action="mark-turno-status" data-id="${turno._id}" data-status="pendiente">Volver a pendiente</button>`
        );
    }

    if (includeDelete) {
        buttons.push(
            `<button class="btn danger" type="button" data-action="delete-turno" data-id="${turno._id}">Eliminar</button>`
        );
    }

    return `<div class="row-actions">${buttons.join('')}</div>`;
}

function renderTurnosTable() {
    const body = $('turnosTableBody');
    const peluqueroSeleccionado = $('turnosFiltroPeluquero')?.value || '';
    const fechaActual = getLocalDateString();
    const minutosActuales = getCurrentMinutesLocal();
    const turnosVisibles = state.turnos.filter((turno) => {
        if (!peluqueroSeleccionado) {
            return true;
        }
        return String(turno.peluquero?._id || '') === String(peluqueroSeleccionado);
    });

    if (!turnosVisibles.length) {
        body.innerHTML = '<tr><td colspan="7">No hay reservas para ese filtro.</td></tr>';
        return;
    }

    body.innerHTML = turnosVisibles.map((t) => {
        const servicio = getServicioTurnoLabel(t);
        const hasPhotos = Boolean(t.foto1 || t.foto2);
        const fotosCell = hasPhotos
            ? `<button class="btn photo-thumb-btn" type="button" data-action="view-turno-fotos" data-id="${t._id}">Ver fotos</button>`
            : '-';
        const estado = getTurnoEstado(t);
        const estadoCell = `<span class="status-chip ${getTurnoEstadoClass(estado)}">${getTurnoEstadoLabel(estado)}</span>`;
        const rowClass = isTurnoDelMomento(t, fechaActual, minutosActuales) ? 'turno-row turno-current' : 'turno-row';

        return `
            <tr class="${rowClass}">
                <td>${t.horaInicio} - ${t.horaFin}</td>
                <td>${escapeHtml(t.peluquero?.nombre || '-')}</td>
                <td>${escapeHtml(servicio)}</td>
                <td>${escapeHtml(t.cliente || '-')}</td>
                <td>${estadoCell}</td>
                <td>${fotosCell}</td>
                <td>${renderTurnoActionButtons(t, !isAgendaRole())}</td>
            </tr>
        `;
    }).join('');
}

function renderTurnosAhoraPanel() {
    const panel = $('turnosAhoraPanel');
    const resumen = $('turnosAhoraResumen');
    const list = $('turnosAhoraList');

    if (!panel || !resumen || !list) {
        return;
    }

    if (!state.turnosDelMomento.length) {
        panel.classList.add('hidden');
        resumen.textContent = 'Avisos de turnos que ya estan en horario.';
        list.innerHTML = '';
        return;
    }

    panel.classList.remove('hidden');
    resumen.textContent = `Hay ${state.turnosDelMomento.length} turno(s) en horario para atender ahora.`;
    list.innerHTML = state.turnosDelMomento.map((turno) => {
        const servicio = getServicioTurnoLabel(turno);
        return `
            <article class="turno-alert-card">
                <div class="turno-alert-copy">
                    <strong>${escapeHtml(turno.cliente || 'Cliente sin nombre')} - ${escapeHtml(turno.peluquero?.nombre || 'Sin peluquero')}</strong>
                    <p>${escapeHtml(turno.horaInicio)} a ${escapeHtml(turno.horaFin)} · ${escapeHtml(servicio)}</p>
                </div>
                ${renderTurnoActionButtons(turno)}
            </article>
        `;
    }).join('');
}

function syncTurnoInCollection(collection, turnoActualizado) {
    const index = collection.findIndex((item) => item._id === turnoActualizado._id);
    if (index >= 0) {
        collection[index] = turnoActualizado;
    }
}

function syncTurnoActualizado(turnoActualizado) {
    syncTurnoInCollection(state.turnos, turnoActualizado);
    syncTurnoInCollection(state.turnosDelMomento, turnoActualizado);

    if (!isTurnoDelMomento(turnoActualizado)) {
        state.turnosDelMomento = state.turnosDelMomento.filter((item) => item._id !== turnoActualizado._id);
    }

    renderTurnosTable();
    renderTurnosAhoraPanel();
}

function avisarTurnosDelMomento(turnos) {
    const nuevos = turnos.filter((turno) => !turnosAlertados.has(turno._id));
    if (!nuevos.length) {
        return;
    }

    nuevos.forEach((turno) => {
        turnosAlertados.add(turno._id);
    });

    const mensaje = nuevos
        .map((turno) => `${turno.horaInicio} ${turno.cliente || 'Cliente sin nombre'} con ${turno.peluquero?.nombre || 'Sin peluquero'}`)
        .join(' | ');

    showMessage(`Turno en horario: ${mensaje}`, 'success');
}

function completarClientesDatalist() {
    const options = state.clientes
        .map((cliente) => (
            `<option value="${escapeHtml(cliente.nombre)}" label="Tel ${escapeHtml(cliente.telefono || '-')}"></option>`
        ))
        .join('');

    ['clientesDatalist', 'cajaClientesDatalist'].forEach((id) => {
        const datalist = $(id);
        if (datalist) {
            datalist.innerHTML = options;
        }
    });
}

function renderClientesList() {
    const list = $('clientesList');
    const rawSearch = $('clientesSearch')?.value || '';
    const search = normalizeText(rawSearch);
    const searchDigits = normalizeDigits(rawSearch);

    const visibles = state.clientes.filter((cliente) => {
        const byName = normalizeText(cliente.nombre).includes(search);
        const byPhone = searchDigits ? normalizeDigits(cliente.telefono).includes(searchDigits) : false;
        return byName || byPhone;
    });

    if (!visibles.length) {
        list.innerHTML = '<p class="cliente-vacio">No hay clientes cargados.</p>';
        return;
    }

    list.innerHTML = visibles.map((cliente) => `
        <div class="cliente-item ${state.selectedClienteId === cliente._id ? 'active' : ''}" data-action="select-cliente" data-id="${cliente._id}">
            <strong>${escapeHtml(cliente.nombre)}</strong>
            <small>Tel: ${escapeHtml(cliente.telefono || '-')}</small>
            <small>
                ${cliente.ultimaAtencion
        ? `Ultima atencion: ${escapeHtml(cliente.ultimaAtencion)}${cliente.ultimaAtencionPeluquero ? ` - ${escapeHtml(cliente.ultimaAtencionPeluquero)}` : ''}`
        : 'Sin atenciones'}
            </small>
        </div>
    `).join('');
}

function renderClienteDetalle() {
    const cliente = state.clientes.find((item) => item._id === state.selectedClienteId);

    if (!cliente) {
        $('clienteDetalleVacio').classList.remove('hidden');
        $('clienteDetalle').classList.add('hidden');
        return;
    }

    $('clienteDetalleVacio').classList.add('hidden');
    $('clienteDetalle').classList.remove('hidden');
    $('clienteNombre').textContent = cliente.nombre || '-';
    $('clienteTelefono').textContent = cliente.telefono || '-';
    $('clienteInstagram').textContent = cliente.instagram || '-';
    $('clienteFechaCumple').textContent = formatDateLabel(cliente.fechaCumpleanos);
    $('clienteUltimaAtencion').textContent = cliente.ultimaAtencion || '-';
    $('clienteUltimaAtencionPeluquero').textContent = cliente.ultimaAtencionPeluquero || '-';

    const foto1 = $('clienteFoto1');
    const foto2 = $('clienteFoto2');

    if (cliente.foto1) {
        foto1.src = cliente.foto1;
        foto1.classList.remove('hidden');
    } else {
        foto1.src = '';
        foto1.classList.add('hidden');
    }

    if (cliente.foto2) {
        foto2.src = cliente.foto2;
        foto2.classList.remove('hidden');
    } else {
        foto2.src = '';
        foto2.classList.add('hidden');
    }
}

function mergeClienteInState(clienteActualizado) {
    const index = state.clientes.findIndex((item) => item._id === clienteActualizado._id);
    if (index >= 0) {
        state.clientes[index] = {
            ...state.clientes[index],
            ...clienteActualizado,
            detalleCargado: true
        };
        return state.clientes[index];
    }

    const nuevoCliente = {
        ...clienteActualizado,
        detalleCargado: true
    };
    state.clientes.push(nuevoCliente);
    return nuevoCliente;
}

async function ensureClienteDetalle(clienteId) {
    const cliente = state.clientes.find((item) => item._id === clienteId);
    if (!cliente) {
        return null;
    }

    if (cliente.detalleCargado) {
        return cliente;
    }

    const detalle = await apiFetch(`/api/clientes/${clienteId}`);
    return mergeClienteInState(detalle);
}

function resetClienteForm() {
    $('clienteIdInput').value = '';
    $('clienteFormTitle').textContent = 'Nuevo cliente';
    $('clienteSubmitBtn').textContent = 'Guardar cliente';
    $('cancelEditCliente').classList.add('hidden');
    $('clienteForm').reset();
    clearClientePhotos();
}

async function fillClienteForm(clienteId) {
    let cliente = state.clientes.find((item) => item._id === clienteId);
    if (!cliente) {
        showMessage('Selecciona un cliente valido para editar', 'error');
        return;
    }

    if (!cliente.detalleCargado) {
        try {
            cliente = await ensureClienteDetalle(clienteId);
        } catch (error) {
            showMessage(error.message, 'error');
            return;
        }
    }

    debugger;
    const parsed = splitFullName(cliente.nombre);
    $('clienteIdInput').value = cliente._id;
    $('clienteFormTitle').textContent = 'Editar cliente';
    $('clienteSubmitBtn').textContent = 'Guardar cambios';
    $('cancelEditCliente').classList.remove('hidden');
    $('clienteNombreInput').value = parsed.nombre || '';
    $('clienteApellidoInput').value = parsed.apellido || '';
    $('clienteTelefonoInput').value = cliente.telefono || '';
    $('clienteInstagramInput').value = cliente.instagram || '';
    $('clienteFechaCumpleInput').value = formatDateLabel(cliente.fechaCumpleanos);
    setClienteFormPhoto('1', cliente.foto1 || '');
    setClienteFormPhoto('2', cliente.foto2 || '');
}

function getMonthDayFromDateString(value) {
    const text = String(value || '').trim();
    let parts = null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [year, month, day] = text.split('-').map(Number);
        parts = { year, month, day };
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
        const [day, month, year] = text.split('/').map(Number);
        parts = { year, month, day };
    } else {
        return null;
    }

    const date = new Date(parts.year, parts.month - 1, parts.day);
    if (
        Number.isNaN(date.getTime())
        || date.getFullYear() !== parts.year
        || date.getMonth() !== parts.month - 1
        || date.getDate() !== parts.day
    ) {
        return null;
    }

    return {
        month: parts.month,
        day: parts.day
    };
}

function formatDateLabel(dateString) {
    const text = String(dateString || '').trim();
    if (!text) {
        return '-';
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
        return text;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const parsed = new Date(`${text}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    }

    return text;
}

function formatBirthdayInputValue(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    const parts = [];

    if (digits.length > 0) {
        parts.push(digits.slice(0, 2));
    }
    if (digits.length > 2) {
        parts.push(digits.slice(2, 4));
    }
    if (digits.length > 4) {
        parts.push(digits.slice(4, 8));
    }

    return parts.join('/');
}

function toWhatsAppNumber(rawPhone) {
    const digits = normalizeDigits(rawPhone);
    if (!digits) {
        return '';
    }

    if (digits.startsWith('54')) {
        return digits;
    }

    if (digits.startsWith('0')) {
        return `54${digits.slice(1)}`;
    }

    if (digits.length >= 10) {
        return `54${digits}`;
    }

    return digits;
}

function buildCumpleMessage(clienteNombre, fechaSeleccionada) {
    const fechaTexto = formatDateLabel(fechaSeleccionada);
    return `Hola ${String(clienteNombre || '').trim()}, el dia ${fechaTexto} es tu cumple tenes un corte de pelo gratis avisanos tu horario para reservar.`;
}

function toDateStringLocal(date) {
    return date.toISOString().slice(0, 10);
}

function getBirthdayEntriesForDate(dateString) {
    const target = getMonthDayFromDateString(dateString);
    if (!target) {
        return [];
    }

    const clientes = state.clientes.filter((cliente) => {
        const cumple = getMonthDayFromDateString(cliente.fechaCumpleanos);
        return cumple && cumple.month === target.month && cumple.day === target.day;
    }).map((cliente) => ({
        fecha: dateString,
        tipo: 'Cliente',
        tipoClass: 'cumple-badge-cliente',
        nombreCompleto: cliente.nombre || '',
        telefono: String(cliente.telefono || '').trim()
    }));

    const personal = state.peluqueros.filter((peluquero) => {
        const cumple = getMonthDayFromDateString(peluquero.fechaCumpleanos);
        return cumple && cumple.month === target.month && cumple.day === target.day;
    }).map((peluquero) => ({
        fecha: dateString,
        tipo: 'Personal',
        tipoClass: 'cumple-badge-personal',
        nombreCompleto: peluquero.nombre || '',
        telefono: String(peluquero.telefono || '').trim()
    }));

    return clientes.concat(personal);
}

function getCumpleMonthDate() {
    if (state.currentCumpleMonth) {
        return new Date(`${state.currentCumpleMonth}-01T00:00:00`);
    }
    const date = new Date();
    date.setDate(1);
    return date;
}

function setCurrentCumpleMonth(value) {
    const date = typeof value === 'string'
        ? new Date(`${value}-01T00:00:00`)
        : new Date(value);
    date.setDate(1);
    state.currentCumpleMonth = toDateStringLocal(date).slice(0, 7);
}

function getCumpleMonthData() {
    const monthDate = getCumpleMonthDate();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDate = new Map();
    const entries = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const dateString = toDateStringLocal(date);
        const matches = getBirthdayEntriesForDate(dateString);
        if (!matches.length) {
            continue;
        }
        byDate.set(dateString, matches);
        entries.push(...matches);
    }

    return {
        year,
        month,
        byDate,
        entries
    };
}

function formatMonthYearLabel(year, month) {
    return new Date(year, month, 1).toLocaleDateString('es-AR', {
        month: 'long',
        year: 'numeric'
    });
}

function changeCumpleMonth(offset) {
    const current = getCumpleMonthDate();
    current.setMonth(current.getMonth() + offset);
    setCurrentCumpleMonth(current);

    const selectedMonth = state.selectedCumpleDate ? state.selectedCumpleDate.slice(0, 7) : '';
    if (selectedMonth !== state.currentCumpleMonth) {
        state.selectedCumpleDate = null;
    }

    renderCumpleanos();
}

function normalizeCumpleSelection(monthData) {
    if (state.selectedCumpleDate && state.selectedCumpleDate.slice(0, 7) === state.currentCumpleMonth) {
        return;
    }

    const todayValue = today();
    if (monthData.byDate.has(todayValue) && todayValue.slice(0, 7) === state.currentCumpleMonth) {
        state.selectedCumpleDate = todayValue;
        return;
    }

    const firstBirthdayDate = Array.from(monthData.byDate.keys()).sort()[0] || null;
    state.selectedCumpleDate = firstBirthdayDate;
}

function renderCumpleCalendar(monthData) {
    const container = $('cumpleCalendar');
    const label = $('cumpleMonthLabel');
    if (!container) {
        return;
    }

    const weekNames = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const firstOfMonth = new Date(monthData.year, monthData.month, 1);
    const daysInMonth = new Date(monthData.year, monthData.month + 1, 0).getDate();
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const cells = [];
    const todayValue = today();

    if (label) {
        label.textContent = formatMonthYearLabel(monthData.year, monthData.month);
    }

    for (let i = 0; i < startOffset; i += 1) {
        cells.push('<div class="cumple-day empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(monthData.year, monthData.month, day);
        const dateString = toDateStringLocal(date);
        const matches = monthData.byDate.get(dateString) || [];
        const classes = ['cumple-day'];

        if (matches.length) {
            classes.push('has-birthday');
        }
        if (state.selectedCumpleDate === dateString) {
            classes.push('selected');
        }
        if (todayValue === dateString) {
            classes.push('today');
        }

        const badge = matches.length ? `<span class="cumple-day-count">${matches.length}</span>` : '';
        cells.push(`
            <button class="${classes.join(' ')}" type="button" data-action="select-cumple-day" data-date="${dateString}" title="${matches.length ? `${matches.length} cumpleanos` : 'Sin cumpleanos'}">
                <span class="cumple-day-number">${day}</span>
                ${badge}
            </button>
        `);
    }

    container.innerHTML = `
        <section class="cumple-month card">
            <div class="cumple-weekdays">
                ${weekNames.map((name) => `<span>${name}</span>`).join('')}
            </div>
            <div class="cumple-grid">
                ${cells.join('')}
            </div>
        </section>
    `;
}

function renderCumpleanos() {
    const resumen = $('cumpleResumen');
    const body = $('cumpleTableBody');
    if (!resumen || !body) {
        return;
    }

    const monthData = getCumpleMonthData();
    normalizeCumpleSelection(monthData);
    const cumpleaneros = monthData.entries;
    const cumpleanerosClientes = cumpleaneros.filter((persona) => persona.tipo === 'Cliente');
    const cumpleanerosPersonal = cumpleaneros.filter((persona) => persona.tipo === 'Personal');
    const selectedDate = state.selectedCumpleDate;
    const selectedEntries = selectedDate ? (monthData.byDate.get(selectedDate) || []) : [];

    renderCumpleCalendar(monthData);

    if (!cumpleaneros.length) {
        resumen.textContent = `No hay cumpleanos cargados en ${formatMonthYearLabel(monthData.year, monthData.month)}.`;
        body.innerHTML = '<tr><td colspan="5">No hay personas para este mes.</td></tr>';
        return;
    }

    if (!selectedDate) {
        resumen.textContent = `Cumpleanos de ${formatMonthYearLabel(monthData.year, monthData.month)}: ${cumpleaneros.length} persona(s) - ${cumpleanerosClientes.length} cliente(s), ${cumpleanerosPersonal.length} personal. Selecciona un dia verde para ver el detalle.`;
        body.innerHTML = '<tr><td colspan="5">Selecciona un dia con linea verde para ver los cumpleanos.</td></tr>';
        return;
    }

    if (!selectedEntries.length) {
        resumen.textContent = `No hay cumpleanos para el ${formatDateLabel(selectedDate)}.`;
        body.innerHTML = '<tr><td colspan="5">No hay personas para la fecha seleccionada.</td></tr>';
        return;
    }

    const clientesDelDia = selectedEntries.filter((persona) => persona.tipo === 'Cliente').length;
    const personalDelDia = selectedEntries.filter((persona) => persona.tipo === 'Personal').length;
    resumen.textContent = `Cumpleanos del ${formatDateLabel(selectedDate)}: ${selectedEntries.length} persona(s) - ${clientesDelDia} cliente(s), ${personalDelDia} personal.`;
    body.innerHTML = selectedEntries.map((persona) => {
        const fullName = splitFullName(persona.nombreCompleto);
        const telefono = String(persona.telefono || '').trim();
        const waNumber = toWhatsAppNumber(telefono);
        const waText = encodeURIComponent(buildCumpleMessage(persona.nombreCompleto, persona.fecha));
        const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : '';
        const telefonoCell = waLink
            ? `<a class="cumple-phone-link" href="${waLink}" target="_blank" rel="noopener noreferrer">${escapeHtml(telefono || '-')}</a>`
            : escapeHtml(telefono || '-');
        const waCell = waLink
            ? `<a class="btn whatsapp-btn" href="${waLink}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`
            : '-';

        return `
            <tr>
                <td>${escapeHtml(formatDateLabel(persona.fecha))}</td>
                <td><span class="cumple-badge ${persona.tipoClass}">${escapeHtml(persona.tipo)}</span></td>
                <td>${escapeHtml(`${fullName.nombre || ''} ${fullName.apellido || ''}`.trim() || persona.nombreCompleto || '-')}</td>
                <td>${telefonoCell}</td>
                <td>${waCell}</td>
            </tr>
        `;
    }).join('');
}

async function selectCliente(clienteId) {
    state.selectedClienteId = clienteId;
    renderClientesList();
    try {
        await ensureClienteDetalle(clienteId);
    } catch (error) {
        showMessage(error.message, 'error');
    }
    renderClienteDetalle();
}

function splitFullName(fullName) {
    const text = String(fullName || '').trim();
    if (!text) {
        return { nombre: '', apellido: '' };
    }

    const parts = text.split(/\s+/);
    return {
        nombre: parts.shift() || '',
        apellido: parts.join(' ')
    };
}

function findClienteByNombre(nombre) {
    const target = normalizeText(nombre);
    if (!target) {
        return null;
    }
    return state.clientes.find((cliente) => normalizeText(cliente.nombre) === target) || null;
}

function updateTurnoClienteInfo(cliente) {
    const card = $('turnoClienteInfo');
    const foto1 = $('turnoClienteInfoFoto1');
    const foto2 = $('turnoClienteInfoFoto2');

    if (!cliente) {
        card.classList.add('hidden');
        $('turnoClienteInfoNombre').textContent = '-';
        $('turnoClienteInfoTelefono').textContent = '-';
        $('turnoClienteInfoInstagram').textContent = '-';
        foto1.src = '';
        foto1.classList.add('hidden');
        foto2.src = '';
        foto2.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');
    $('turnoClienteInfoNombre').textContent = cliente.nombre || '-';
    $('turnoClienteInfoTelefono').textContent = cliente.telefono || '-';
    $('turnoClienteInfoInstagram').textContent = cliente.instagram || '-';

    if (cliente.foto1) {
        foto1.src = cliente.foto1;
        foto1.classList.remove('hidden');
    } else {
        foto1.src = '';
        foto1.classList.add('hidden');
    }

    if (cliente.foto2) {
        foto2.src = cliente.foto2;
        foto2.classList.remove('hidden');
    } else {
        foto2.src = '';
        foto2.classList.add('hidden');
    }
}

function syncTurnoClienteByInput() {
    const clienteNombre = $('turnoCliente').value.trim();
    if (!clienteNombre) {
        state.selectedTurnoClienteId = null;
        updateTurnoClienteInfo(null);
        return null;
    }

    const cliente = findClienteByNombre(clienteNombre);
    if (!cliente) {
        state.selectedTurnoClienteId = null;
        updateTurnoClienteInfo(null);
        return null;
    }

    state.selectedTurnoClienteId = cliente._id;
    $('turnoCliente').value = cliente.nombre;
    updateTurnoClienteInfo(cliente);
    if (!cliente.detalleCargado) {
        ensureClienteDetalle(cliente._id)
            .then((detalle) => {
                if (detalle && state.selectedTurnoClienteId === detalle._id) {
                    updateTurnoClienteInfo(detalle);
                }
            })
            .catch((error) => {
                console.warn('No se pudo cargar el detalle del cliente:', error.message);
            });
    }
    return cliente;
}

function openNuevoClienteTurnoModal(nombreCompleto) {
    const modal = $('nuevoClienteTurnoModal');
    state.pendingTurnoClienteNombre = String(nombreCompleto || '').trim();
    const parsed = splitFullName(nombreCompleto);
    $('nuevoClienteTurnoNombre').value = parsed.nombre;
    $('nuevoClienteTurnoApellido').value = parsed.apellido;
    $('nuevoClienteTurnoTelefono').value = '';
    $('nuevoClienteTurnoInstagram').value = '';
    $('nuevoClienteTurnoFechaCumple').value = '';
    modal.classList.remove('hidden');
}

function closeNuevoClienteTurnoModal() {
    $('nuevoClienteTurnoModal').classList.add('hidden');
    state.pendingTurnoClienteNombre = '';
}

function maybeOpenNuevoClienteTurnoModal() {
    const clienteNombre = $('turnoCliente').value.trim();
    if (!clienteNombre) {
        return;
    }

    if (findClienteByNombre(clienteNombre)) {
        return;
    }

    if (!$('nuevoClienteTurnoModal').classList.contains('hidden')) {
        return;
    }

    if (state.pendingTurnoClienteNombre === clienteNombre) {
        return;
    }

    openNuevoClienteTurnoModal(clienteNombre);
    showMessage('Cliente no encontrado. Completa el popup para crearlo.', 'error');
}

function openEditarUsuarioModal(user) {
    $('editarUsuarioId').value = user._id || user.id;
    $('editarUsuarioNombre').value = user.username || '';
    $('editarUsuarioRol').value = user.role || 'user';
    $('editarUsuarioPassword').value = '';
    $('editarUsuarioModal').classList.remove('hidden');
}

function closeEditarUsuarioModal() {
    $('editarUsuarioModal').classList.add('hidden');
}

function renderCajaTable() {
    const body = $('cajaTableBody');
    if (!body) {
        return;
    }

    body.innerHTML = state.atenciones.map((a) => `
        <tr>
            <td>${a.fecha}</td>
            <td>${escapeHtml(a.peluquero?.nombre || '-')}</td>
            <td>${escapeHtml(a.cliente || '-')}</td>
            <td>${escapeHtml(a.formaPago || '-')}</td>
            <td>$${Number(a.montoCobrado).toFixed(2)}</td>
            <td>$${Number(a.comisionGanada).toFixed(2)} (${a.comisionPorcentaje}%)</td>
        </tr>
    `).join('');
}

function renderUsuariosTable() {
    const body = $('usuariosTableBody');

    body.innerHTML = state.usuarios.map((u) => `
        <tr>
            <td>${escapeHtml(u.username)}</td>
            <td><code>${escapeHtml(u.passwordVisible || '(sin registro)')}</code></td>
            <td>${escapeHtml(u.role)}</td>
            <td>${new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
            <td><button class="btn" type="button" data-action="edit-user" data-id="${u._id || u.id}">Editar</button></td>
        </tr>
    `).join('');
}

function renderReportes(atenciones = []) {
    const container = $('reportesContainer');
    const body = $('reporteDiaTableBody');

    if (!container || !body) {
        return;
    }

    const totalCobrado = atenciones.reduce((acc, item) => acc + Number(item.montoCobrado || 0), 0);
    const totalComision = atenciones.reduce((acc, item) => acc + Number(item.comisionGanada || 0), 0);
    const netoSalon = totalCobrado - totalComision;

    const groupedByBarber = new Map();
    atenciones.forEach((item) => {
        const barberName = item.peluquero?.nombre || 'Sin peluquero';
        if (!groupedByBarber.has(barberName)) {
            groupedByBarber.set(barberName, { total: 0, comision: 0 });
        }
        const target = groupedByBarber.get(barberName);
        target.total += Number(item.montoCobrado || 0);
        target.comision += Number(item.comisionGanada || 0);
    });

    const resumenPeluqueros = Array.from(groupedByBarber.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([nombre, values]) => (
            `<li><strong>${escapeHtml(nombre)}:</strong> $${values.total.toFixed(2)} (Comision $${values.comision.toFixed(2)})</li>`
        ))
        .join('');

    container.innerHTML = `
        <article class="report-card">
            <div class="report-header">
                <strong>Totales del dia</strong>
                <span>Total cobrado: $${totalCobrado.toFixed(2)} | Total comision: $${totalComision.toFixed(2)} | Neto salon: $${netoSalon.toFixed(2)}</span>
            </div>
            ${resumenPeluqueros ? `<ul class="form-grid">${resumenPeluqueros}</ul>` : '<p>No hay ventas para la fecha seleccionada.</p>'}
        </article>
    `;

    if (!atenciones.length) {
        body.innerHTML = '<tr><td colspan="4">No hay ventas para el filtro seleccionado.</td></tr>';
        return;
    }

    body.innerHTML = atenciones.map((item) => `
        <tr>
            <td>${escapeHtml(item.peluquero?.nombre || '-')}</td>
            <td>${escapeHtml(item.cliente || '-')}</td>
            <td>$${Number(item.montoCobrado || 0).toFixed(2)}</td>
            <td>$${Number(item.comisionGanada || 0).toFixed(2)}</td>
        </tr>
    `).join('');
}

function resetPeluqueroForm() {
    $('peluqueroId').value = '';
    $('peluqueroNombre').value = '';
    $('peluqueroTelefono').value = '';
    $('peluqueroFechaCumple').value = '';
    $('peluqueroComision').value = '40';
    $('peluqueroInicio').value = '10:00';
    $('peluqueroFin').value = '22:00';
    $('peluqueroActivo').checked = true;
    document.querySelectorAll('.day-check').forEach((check) => {
        check.checked = Number(check.value) >= 1 && Number(check.value) <= 6;
    });
}

function resetServicioForm() {
    $('servicioId').value = '';
    $('servicioNombre').value = '';
    $('servicioPrecio').value = '';
    $('servicioDuracion').value = '30';
}

function readPeluqueroAgenda() {
    const inicio = $('peluqueroInicio').value;
    const fin = $('peluqueroFin').value;

    if (!inicio || !fin) {
        throw new Error('Debes definir hora de inicio y fin');
    }

    const dias = Array.from(document.querySelectorAll('.day-check:checked')).map((c) => Number(c.value));

    if (!dias.length) {
        throw new Error('Selecciona al menos un dia de trabajo');
    }

    return dias.map((dayOfWeek) => ({ dayOfWeek, start: inicio, end: fin }));
}

function fillPeluqueroForm(barberId) {
    const barber = state.peluqueros.find((p) => p._id === barberId);

    if (!barber) {
        return;
    }

    $('peluqueroId').value = barber._id;
    $('peluqueroNombre').value = barber.nombre;
    $('peluqueroTelefono').value = barber.telefono || '';
    $('peluqueroFechaCumple').value = formatDateLabel(barber.fechaCumpleanos);
    $('peluqueroComision').value = barber.porcentajeComision;
    $('peluqueroActivo').checked = barber.activo;

    const baseSlot = barber.agenda[0] || { start: '10:00', end: '22:00' };
    $('peluqueroInicio').value = baseSlot.start;
    $('peluqueroFin').value = baseSlot.end;

    const activeDays = new Set(barber.agenda.map((slot) => slot.dayOfWeek));
    document.querySelectorAll('.day-check').forEach((check) => {
        check.checked = activeDays.has(Number(check.value));
    });
}

function fillServicioForm(servicioId) {
    const servicio = state.serviciosCaja.find((item) => item._id === servicioId);
    if (!servicio) {
        showMessage('Servicio no encontrado', 'error');
        return;
    }

    $('servicioId').value = servicio._id;
    $('servicioNombre').value = servicio.nombre;
    $('servicioPrecio').value = Number(servicio.precio).toFixed(2);
    $('servicioDuracion').value = Number(servicio.duracionMinutos || 30);
}

function getTurnoPhotoRefs(slot) {
    if (slot === '1') {
        return {
            input: $('turnoFoto1'),
            preview: $('turnoFoto1Preview'),
            status: $('turnoFoto1Estado')
        };
    }

    return {
        input: $('turnoFoto2'),
        preview: $('turnoFoto2Preview'),
        status: $('turnoFoto2Estado')
    };
}

function getClientePhotoRefs(slot) {
    if (slot === '1') {
        return {
            input: $('clienteFoto1Input'),
            preview: $('clienteFoto1Preview'),
            status: $('clienteFoto1Estado')
        };
    }

    return {
        input: $('clienteFoto2Input'),
        preview: $('clienteFoto2Preview'),
        status: $('clienteFoto2Estado')
    };
}

function setTurnoPhotoStatus(slot, message, isError = false) {
    const { status } = getTurnoPhotoRefs(slot);
    status.textContent = message || '';
    status.style.color = isError ? '#b91c1c' : '#475569';
}

function setClientePhotoStatus(slot, message, isError = false) {
    const { status } = getClientePhotoRefs(slot);
    status.textContent = message || '';
    status.style.color = isError ? '#b91c1c' : '#475569';
}

function estimarBytesDesdeDataURL(dataUrl) {
    const base64 = dataUrl.split(',')[1] || '';
    return Math.ceil((base64.length * 3) / 4);
}

function leerArchivoComoDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(file);
    });
}

function cargarImagen(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = function() {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };

        img.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo procesar la imagen'));
        };

        img.src = objectUrl;
    });
}

async function convertirImagenCanvasAJpeg(file) {
    const img = await cargarImagen(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No se pudo inicializar la compresion');
    }

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }

    let quality = 0.85;
    let dataUrl = '';

    while (true) {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        dataUrl = canvas.toDataURL('image/jpeg', quality);
        const bytes = estimarBytesDesdeDataURL(dataUrl);

        if (bytes <= TARGET_IMAGE_BYTES) {
            break;
        }

        if (quality > MIN_JPEG_QUALITY) {
            quality = Math.max(MIN_JPEG_QUALITY, quality - 0.08);
            continue;
        }

        if (width <= MIN_IMAGE_DIMENSION || height <= MIN_IMAGE_DIMENSION) {
            break;
        }

        width = Math.round(width * 0.85);
        height = Math.round(height * 0.85);
    }

    return dataUrl;
}

function canPreviewDataUrl(dataUrl) {
    const mime = String(dataUrl || '').slice(0, 80).toLowerCase();
    return !mime.includes('image/heic') && !mime.includes('image/heif');
}

async function convertirImagenABase64(file) {
    try {
        const converted = await convertirImagenCanvasAJpeg(file);
        return {
            dataUrl: converted,
            previewable: true,
            source: 'canvas'
        };
    } catch (error) {
        const dataUrl = await leerArchivoComoDataURL(file);
        const bytes = estimarBytesDesdeDataURL(dataUrl);

        if (bytes > MAX_FALLBACK_FILE_BYTES) {
            throw new Error('Imagen demasiado pesada para este formato. Usa una imagen mas liviana.');
        }

        return {
            dataUrl,
            previewable: canPreviewDataUrl(dataUrl),
            source: 'fallback'
        };
    }
}

async function processTurnoPhoto(slot) {
    const refs = getTurnoPhotoRefs(slot);
    const file = refs.input.files && refs.input.files[0] ? refs.input.files[0] : null;

    if (!file) {
        return;
    }

    try {
        setTurnoPhotoStatus(slot, 'Procesando imagen...');
        const conversion = await convertirImagenABase64(file);
        refs.input.dataset.base64 = conversion.dataUrl;

        if (conversion.previewable) {
            refs.preview.src = conversion.dataUrl;
            refs.preview.classList.remove('hidden');
        } else {
            refs.preview.src = '';
            refs.preview.classList.add('hidden');
        }

        const kb = Math.round(estimarBytesDesdeDataURL(conversion.dataUrl) / 1024);
        const suffix = conversion.previewable ? '' : ' - sin vista previa';
        setTurnoPhotoStatus(slot, `Lista (${kb} KB)${suffix}`);
    } catch (error) {
        refs.input.value = '';
        delete refs.input.dataset.base64;
        refs.preview.src = '';
        refs.preview.classList.add('hidden');
        setTurnoPhotoStatus(slot, error.message, true);
        throw error;
    }
}

async function processClientePhoto(slot) {
    const refs = getClientePhotoRefs(slot);
    const file = refs.input.files && refs.input.files[0] ? refs.input.files[0] : null;

    if (!file) {
        return;
    }

    try {
        setClientePhotoStatus(slot, 'Procesando imagen...');
        const conversion = await convertirImagenABase64(file);
        refs.input.dataset.base64 = conversion.dataUrl;

        if (conversion.previewable) {
            refs.preview.src = conversion.dataUrl;
            refs.preview.classList.remove('hidden');
        } else {
            refs.preview.src = '';
            refs.preview.classList.add('hidden');
        }

        const kb = Math.round(estimarBytesDesdeDataURL(conversion.dataUrl) / 1024);
        const suffix = conversion.previewable ? '' : ' - sin vista previa';
        setClientePhotoStatus(slot, `Lista (${kb} KB)${suffix}`);
    } catch (error) {
        refs.input.value = '';
        delete refs.input.dataset.base64;
        refs.preview.src = '';
        refs.preview.classList.add('hidden');
        setClientePhotoStatus(slot, error.message, true);
        throw error;
    }
}

async function getProcessedTurnoPhoto(slot) {
    const refs = getTurnoPhotoRefs(slot);

    if (refs.input.dataset.base64) {
        return refs.input.dataset.base64;
    }

    if (refs.input.files && refs.input.files[0]) {
        await processTurnoPhoto(slot);
        return refs.input.dataset.base64 || '';
    }

    return '';
}

async function getProcessedClientePhoto(slot) {
    const refs = getClientePhotoRefs(slot);

    if (refs.input.dataset.base64) {
        return refs.input.dataset.base64;
    }

    if (refs.input.files && refs.input.files[0]) {
        await processClientePhoto(slot);
        return refs.input.dataset.base64 || '';
    }

    return '';
}

function setClienteFormPhoto(slot, dataUrl) {
    const refs = getClientePhotoRefs(slot);
    refs.input.value = '';
    delete refs.input.dataset.base64;

    if (dataUrl) {
        refs.preview.src = dataUrl;
        refs.preview.classList.remove('hidden');
        setClientePhotoStatus(slot, 'Foto actual cargada');
        return;
    }

    refs.preview.src = '';
    refs.preview.classList.add('hidden');
    setClientePhotoStatus(slot, '');
}

function clearTurnoPhotos() {
    ['1', '2'].forEach((slot) => {
        const refs = getTurnoPhotoRefs(slot);
        refs.input.value = '';
        delete refs.input.dataset.base64;
        refs.preview.src = '';
        refs.preview.classList.add('hidden');
        setTurnoPhotoStatus(slot, '');
    });
}

function clearClientePhotos() {
    ['1', '2'].forEach((slot) => {
        const refs = getClientePhotoRefs(slot);
        refs.input.value = '';
        delete refs.input.dataset.base64;
        refs.preview.src = '';
        refs.preview.classList.add('hidden');
        setClientePhotoStatus(slot, '');
    });
}

function openTurnoPhotoPicker(slot, source) {
    const refs = getTurnoPhotoRefs(slot);
    refs.input.value = '';
    delete refs.input.dataset.base64;

    if (source === 'camera') {
        refs.input.setAttribute('capture', 'environment');
        setTurnoPhotoStatus(slot, 'Abriendo camara...');
    } else {
        refs.input.removeAttribute('capture');
        setTurnoPhotoStatus(slot, 'Selecciona una imagen de la galeria');
    }

    refs.input.click();
}

window.openTurnoPhotoPicker = openTurnoPhotoPicker;

function openClientePhotoPicker(slot, source) {
    const refs = getClientePhotoRefs(slot);
    refs.input.value = '';
    delete refs.input.dataset.base64;

    if (source === 'camera') {
        refs.input.setAttribute('capture', 'environment');
        setClientePhotoStatus(slot, 'Abriendo camara...');
    } else {
        refs.input.removeAttribute('capture');
        setClientePhotoStatus(slot, 'Selecciona una imagen de la galeria');
    }

    refs.input.click();
}

window.openClientePhotoPicker = openClientePhotoPicker;

function openFotosModal(fotoSrc1, fotoSrc2) {
    const modal = $('turnoFotoModal');
    const foto1 = $('turnoModalFoto1');
    const foto2 = $('turnoModalFoto2');

    if (fotoSrc1) {
        foto1.src = fotoSrc1;
        foto1.classList.remove('hidden');
    } else {
        foto1.src = '';
        foto1.classList.add('hidden');
    }

    if (fotoSrc2) {
        foto2.src = fotoSrc2;
        foto2.classList.remove('hidden');
    } else {
        foto2.src = '';
        foto2.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeTurnoFotoModal() {
    $('turnoFotoModal').classList.add('hidden');
}

function openTurnoFotoModal(turnoId) {
    const turno = state.turnos.find((item) => item._id === turnoId);
    if (!turno) {
        return;
    }
    openFotosModal(turno.foto1, turno.foto2);
}

async function registrarTurno(payload) {
    await apiFetch('/api/turnos', {
        method: 'POST',
        body: payload
    });

    $('turnoCliente').value = '';
    state.selectedTurnoClienteId = null;
    updateTurnoClienteInfo(null);
    clearTurnoPhotos();

    await Promise.all([
        cargarTurnos(),
        cargarTurnosDelMomento({ silent: true }),
        cargarClientes(),
        !isAgendaRole() ? cargarDashboard() : Promise.resolve()
    ]);
}

async function cargarTurnosDelMomento(options = {}) {
    const { silent = false } = options;

    if (!state.token) {
        state.turnosDelMomento = [];
        renderTurnosAhoraPanel();
        return;
    }

    const fechaActual = getLocalDateString();
    const turnosHoy = await apiFetch(`/api/turnos?fecha=${fechaActual}`, { showLoading: false });
    const turnosEnHorario = turnosHoy.filter((turno) => isTurnoDelMomento(turno, fechaActual, getCurrentMinutesLocal()));

    state.turnosDelMomento = turnosEnHorario;
    renderTurnosAhoraPanel();

    if (!silent) {
        avisarTurnosDelMomento(turnosEnHorario);
    }

    if ($('turnosFiltroFecha')?.value === fechaActual) {
        state.turnos = turnosHoy;
        renderTurnosTable();
    }
}

function stopTurnosAhoraWatcher() {
    if (turnosAhoraIntervalId) {
        clearInterval(turnosAhoraIntervalId);
        turnosAhoraIntervalId = null;
    }
}

function startTurnosAhoraWatcher() {
    stopTurnosAhoraWatcher();

    if (!state.token) {
        state.turnosDelMomento = [];
        renderTurnosAhoraPanel();
        return;
    }

    cargarTurnosDelMomento().catch((error) => {
        console.warn('No se pudieron cargar los turnos del momento:', error.message);
    });

    turnosAhoraIntervalId = window.setInterval(() => {
        cargarTurnosDelMomento().catch((error) => {
            console.warn('No se pudieron refrescar los turnos del momento:', error.message);
        });
    }, 30000);
}

async function actualizarEstadoTurno(turnoId, estado) {
    const actualizado = await apiFetch(`/api/turnos/${turnoId}/estado`, {
        method: 'PATCH',
        body: { estado }
    });

    syncTurnoActualizado(actualizado);
    await cargarTurnosDelMomento({ silent: true });
}

async function cargarConfig() {
    try {
        const config = await apiFetch('/api/config', { auth: false });
        if (config?.servicios) {
            state.servicios = config.servicios;
        }
        applyTurnoDateTimeConstraints();
    } catch (error) {
        console.warn('No se pudo cargar config:', error.message);
    }
}

async function cargarDashboard() {
    const fecha = $('dashboardDate').value;
    const data = await apiFetch(`/api/dashboard?fecha=${fecha}`);
    $('kpiTurnos').textContent = data.totalTurnos;
    $('kpiAtenciones').textContent = data.totalAtenciones;
    $('kpiPeluqueros').textContent = data.peluquerosActivos;
}

async function cargarPeluqueros() {
    state.peluqueros = await apiFetch('/api/peluqueros');
    completarSelectPeluqueros();
    renderPeluquerosTable();
    renderCumpleanos();
}

async function cargarServiciosCaja() {
    state.serviciosCaja = await apiFetch('/api/servicios');
    renderCajaServiciosSelect();
    renderTurnoServiciosSelect();
    renderServiciosTable();
}

async function cargarClientes() {
    state.clientes = await apiFetch('/api/clientes');
    completarClientesDatalist();
    renderClientesList();
    renderCumpleanos();

    if (!state.selectedClienteId && state.clientes.length > 0) {
        state.selectedClienteId = state.clientes[0]._id;
    } else if (state.selectedClienteId && !state.clientes.some((c) => c._id === state.selectedClienteId)) {
        state.selectedClienteId = state.clientes.length ? state.clientes[0]._id : null;
    }

    renderClienteDetalle();

    if (state.selectedTurnoClienteId) {
        const clienteTurno = state.clientes.find((item) => item._id === state.selectedTurnoClienteId) || null;
        updateTurnoClienteInfo(clienteTurno);
    }
}

async function cargarTurnos() {
    const fecha = $('turnosFiltroFecha').value;
    state.turnos = await apiFetch(`/api/turnos?fecha=${fecha}`);
    renderTurnosTable();
}

async function cargarAtenciones() {
    const fecha = $('cajaFecha').value;
    if (!fecha) {
        state.atenciones = [];
        renderCajaTable();
        return;
    }
    state.atenciones = await apiFetch(`/api/atenciones?desde=${fecha}&hasta=${fecha}`);
    renderCajaTable();
}

async function cargarReporteDia() {
    const fecha = $('reporteFechaDia').value;
    if (!fecha) {
        throw new Error('Selecciona una fecha para generar el reporte');
    }

    const peluqueroId = $('reportePeluquero').value || '';
    const params = new URLSearchParams({
        desde: fecha,
        hasta: fecha
    });

    if (peluqueroId) {
        params.set('peluqueroId', peluqueroId);
    }

    const atenciones = await apiFetch(`/api/atenciones?${params.toString()}`);
    renderReportes(atenciones);
}

async function cargarUsuarios() {
    if (!isAdminRole()) {
        return;
    }

    state.usuarios = await apiFetch('/api/users');
    renderUsuariosTable();
}

async function cargarTodoInicial() {
    const errores = [];

    async function intentarCarga(label, loader) {
        try {
            await loader();
        } catch (error) {
            console.error(`Error cargando ${label}:`, error);
            errores.push(label);
        }
    }

    await Promise.all([
        intentarCarga('configuracion', cargarConfig),
        intentarCarga('servicios', cargarServiciosCaja),
        intentarCarga('peluqueros', cargarPeluqueros),
        intentarCarga('clientes', cargarClientes),
        intentarCarga('turnos', cargarTurnos),
        intentarCarga('turnos del momento', () => cargarTurnosDelMomento({ silent: true }))
    ]);

    if (!isAgendaRole()) {
        await Promise.all([
            intentarCarga('dashboard', cargarDashboard),
            intentarCarga('usuarios', cargarUsuarios),
            intentarCarga('reportes', cargarReporteDia)
        ]);
    }

    if (errores.length) {
        const resumen = errores.slice(0, 3).join(', ');
        const sufijo = errores.length > 3 ? ', ...' : '';
        showMessage(`La app cargo de forma parcial. Fallaron: ${resumen}${sufijo}.`, 'error');
    }

    return errores;
}

function showApp() {
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    $('sessionInfo').textContent = `Usuario: ${state.user.username} (${state.user.role})`;
    applyRoleVisibility();
    setTab(isAgendaRole() ? 'turnos' : 'dashboard');
}

function showLogin() {
    $('appView').classList.add('hidden');
    $('loginView').classList.remove('hidden');
}

async function restoreSession() {
    if (!state.token) {
        stopTurnosAhoraWatcher();
        state.turnosDelMomento = [];
        turnosAlertados.clear();
        renderTurnosAhoraPanel();
        showLogin();
        return;
    }

    try {
        const me = await apiFetch('/api/auth/me');
        state.user = {
            id: me._id,
            username: me.username,
            role: me.role
        };
        localStorage.setItem('agendaUser', JSON.stringify(state.user));

        showApp();
        await cargarTodoInicial();
        startTurnosAhoraWatcher();
    } catch (error) {
        localStorage.removeItem('agendaToken');
        localStorage.removeItem('agendaUser');
        state.token = null;
        state.user = null;
        stopTurnosAhoraWatcher();
        turnosAlertados.clear();
        showLogin();
    }
}

function attachEvents() {
    $('appMessageOk').addEventListener('click', () => {
        hideMessage();
    });

    $('turnoFoto1').addEventListener('change', async () => {
        try {
            await processTurnoPhoto('1');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('turnoFoto2').addEventListener('change', async () => {
        try {
            await processTurnoPhoto('2');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('clienteFoto1Input').addEventListener('change', async () => {
        try {
            await processClientePhoto('1');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('clienteFoto2Input').addEventListener('change', async () => {
        try {
            await processClientePhoto('2');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cumplePrevMonth').addEventListener('click', () => {
        changeCumpleMonth(-1);
    });

    $('cumpleNextMonth').addEventListener('click', () => {
        changeCumpleMonth(1);
    });

    $('cumpleGoToday').addEventListener('click', () => {
        setCurrentCumpleMonth(today().slice(0, 7));
        state.selectedCumpleDate = null;
        renderCumpleanos();
    });

    $('cumpleCalendar').addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="select-cumple-day"]');
        if (!button) {
            return;
        }

        state.selectedCumpleDate = button.dataset.date;
        renderCumpleanos();
    });

    $('closeTurnoFotoModal').addEventListener('click', closeTurnoFotoModal);
    $('turnoFotoModal').addEventListener('click', (event) => {
        if (event.target.id === 'turnoFotoModal') {
            closeTurnoFotoModal();
        }
    });

    $('loginForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const username = $('loginUsername').value.trim();
            const password = $('loginPassword').value;

            const result = await apiFetch('/api/auth/login', {
                auth: false,
                method: 'POST',
                body: { username, password }
            });

            state.token = result.token;
            state.user = result.user;
            localStorage.setItem('agendaToken', result.token);
            localStorage.setItem('agendaUser', JSON.stringify(result.user));

            $('loginForm').reset();
            showApp();
            const erroresCarga = await cargarTodoInicial();
            startTurnosAhoraWatcher();
            if (!erroresCarga.length) {
                showMessage('Sesion iniciada correctamente');
            }
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('logoutBtn').addEventListener('click', async () => {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn(error.message);
        }

        localStorage.removeItem('agendaToken');
        localStorage.removeItem('agendaUser');
        state.token = null;
        state.user = null;
        stopTurnosAhoraWatcher();
        state.turnosDelMomento = [];
        turnosAlertados.clear();
        renderTurnosAhoraPanel();
        showLogin();
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('hidden')) {
                return;
            }
            setTab(btn.dataset.tab);
        });
    });

    $('refreshDashboard').addEventListener('click', async () => {
        try {
            await cargarDashboard();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('turnoServicio').addEventListener('change', () => {
        applyTurnoDateTimeConstraints();
    });

    $('turnoFecha').addEventListener('change', () => {
        if (!isOpenDay($('turnoFecha').value)) {
            const adjusted = nextOpenDate($('turnoFecha').value);
            $('turnoFecha').value = adjusted;
            showMessage('Solo se permiten turnos de lunes a sabado', 'error');
        }
    });

    ['clienteFechaCumpleInput', 'nuevoClienteTurnoFechaCumple', 'peluqueroFechaCumple'].forEach((id) => {
        const input = $(id);
        if (!input) {
            return;
        }

        input.addEventListener('input', () => {
            input.value = formatBirthdayInputValue(input.value);
        });
    });

    $('turnoCliente').addEventListener('input', () => {
        syncTurnoClienteByInput();
    });

    $('turnoCliente').addEventListener('blur', () => {
        syncTurnoClienteByInput();
        maybeOpenNuevoClienteTurnoModal();
    });

    $('cancelNuevoClienteTurno').addEventListener('click', () => {
        state.pendingTurnoPayload = null;
        closeNuevoClienteTurnoModal();
    });

    $('nuevoClienteTurnoModal').addEventListener('click', (event) => {
        if (event.target.id === 'nuevoClienteTurnoModal') {
            state.pendingTurnoPayload = null;
            closeNuevoClienteTurnoModal();
        }
    });

    $('turnoForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const fechaTurno = $('turnoFecha').value;
            const horaTurno = $('turnoHora').value;
            const servicioTurno = $('turnoServicio').value;
            const duration = getServiceDurationMinutes(servicioTurno);
            const inicioMinutos = parseTimeToMinutesLocal(horaTurno);
            const finMinutos = inicioMinutos + duration;

            if (!isOpenDay(fechaTurno)) {
                throw new Error('Solo se pueden reservar turnos de lunes a sabado');
            }

            if (inicioMinutos < OPENING_MINUTES || finMinutos > CLOSING_MINUTES) {
                const ultimoHorario = minutesToClock(CLOSING_MINUTES - duration);
                throw new Error(`Horario permitido: 10:00 a ${ultimoHorario} para este servicio`);
            }

            const foto1 = await getProcessedTurnoPhoto('1');
            const foto2 = await getProcessedTurnoPhoto('2');
            const clienteNombre = $('turnoCliente').value.trim();
            const clienteCoincidente = syncTurnoClienteByInput();

            const payload = {
                fecha: fechaTurno,
                hora: horaTurno,
                peluqueroId: $('turnoPeluquero').value || null,
                servicioId: servicioTurno,
                cliente: clienteNombre,
                clienteId: clienteCoincidente?._id || null,
                foto1,
                foto2
            };

            if (clienteNombre && !clienteCoincidente) {
                state.pendingTurnoPayload = payload;
                openNuevoClienteTurnoModal(clienteNombre);
                showMessage('Cliente no encontrado. Completa el popup para crearlo.', 'error');
                return;
            }

            await registrarTurno(payload);
            showMessage('Turno guardado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('nuevoClienteTurnoForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const saved = await apiFetch('/api/clientes', {
                method: 'POST',
                body: {
                    nombre: $('nuevoClienteTurnoNombre').value.trim(),
                    apellido: $('nuevoClienteTurnoApellido').value.trim(),
                    telefono: $('nuevoClienteTurnoTelefono').value.trim(),
                    instagram: $('nuevoClienteTurnoInstagram').value.trim(),
                    fechaCumpleanos: $('nuevoClienteTurnoFechaCumple').value
                }
            });

            await cargarClientes();

            $('turnoCliente').value = saved.nombre;
            state.selectedTurnoClienteId = saved._id;
            updateTurnoClienteInfo(saved);
            closeNuevoClienteTurnoModal();

            if (state.pendingTurnoPayload) {
                const payload = {
                    ...state.pendingTurnoPayload,
                    cliente: saved.nombre,
                    clienteId: saved._id
                };
                state.pendingTurnoPayload = null;
                await registrarTurno(payload);
                showMessage('Cliente creado y turno guardado correctamente');
                return;
            }

            showMessage('Cliente creado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('reloadTurnos').addEventListener('click', async () => {
        try {
            await cargarTurnos();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('turnosFiltroPeluquero').addEventListener('change', () => {
        renderTurnosTable();
    });

    $('editSelectedClienteBtn').addEventListener('click', async () => {
        if (!state.selectedClienteId) {
            showMessage('Selecciona un cliente para editar', 'error');
            return;
        }

        await fillClienteForm(state.selectedClienteId);
    });

    $('deleteSelectedClienteBtn').addEventListener('click', async () => {
        const clienteId = state.selectedClienteId;
        if (!clienteId) {
            showMessage('Selecciona un cliente para eliminar', 'error');
            return;
        }

        const cliente = state.clientes.find((item) => item._id === clienteId);
        const nombre = cliente?.nombre || 'este cliente';
        if (!confirm(`Eliminar a ${nombre}?`)) {
            return;
        }

        try {
            await apiFetch(`/api/clientes/${clienteId}`, { method: 'DELETE' });

            if ($('clienteIdInput').value === clienteId) {
                resetClienteForm();
            }

            state.selectedClienteId = null;
            await cargarClientes();
            showMessage('Cliente eliminado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('clientesSearch').addEventListener('input', () => {
        renderClientesList();
    });

    $('clientesList').addEventListener('click', async (event) => {
        const item = event.target.closest('[data-action=\"select-cliente\"]');
        if (!item) {
            return;
        }
        await selectCliente(item.dataset.id);
    });

    $('turnoClienteInfoFoto1').addEventListener('click', () => {
        const cliente = state.clientes.find((item) => item._id === state.selectedTurnoClienteId);
        if (!cliente?.foto1) {
            return;
        }
        openFotosModal(cliente.foto1, cliente.foto2);
    });

    $('turnoClienteInfoFoto2').addEventListener('click', () => {
        const cliente = state.clientes.find((item) => item._id === state.selectedTurnoClienteId);
        if (!cliente?.foto2) {
            return;
        }
        openFotosModal(cliente.foto2, cliente.foto1);
    });

    $('clienteFoto1').addEventListener('click', () => {
        const cliente = state.clientes.find((item) => item._id === state.selectedClienteId);
        if (!cliente?.foto1) {
            return;
        }
        openFotosModal(cliente.foto1, cliente.foto2);
    });

    $('clienteFoto2').addEventListener('click', () => {
        const cliente = state.clientes.find((item) => item._id === state.selectedClienteId);
        if (!cliente?.foto2) {
            return;
        }
        openFotosModal(cliente.foto2, cliente.foto1);
    });

    $('clienteForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const clienteId = $('clienteIdInput').value.trim();
            const nombre = $('clienteNombreInput').value.trim();
            const apellido = $('clienteApellidoInput').value.trim();
            const foto1 = await getProcessedClientePhoto('1');
            const foto2 = await getProcessedClientePhoto('2');

            if (!nombre || !apellido) {
                throw new Error('Nombre y apellido son obligatorios');
            }

            

            const body = {
                nombre,
                apellido,
                telefono: $('clienteTelefonoInput').value.trim(),
                instagram: $('clienteInstagramInput').value.trim(),
                fechaCumpleanos: $('clienteFechaCumpleInput').value,
                foto1,
                foto2
            };

            debugger;
            let saved = null;
            if (clienteId) {

                saved = await apiFetch(`/api/clientes/${clienteId}`, {
                    method: 'PUT',
                    body
                });
            } else {

                saved = await apiFetch('/api/clientes', {
                    method: 'POST',
                    body
                });
            }

            resetClienteForm();
            if (saved?._id) {
                state.selectedClienteId = saved._id;
            }
            await cargarClientes();
            showMessage(clienteId ? 'Cliente actualizado correctamente' : 'Cliente guardado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cancelEditCliente').addEventListener('click', () => {
        resetClienteForm();
    });

    const handleTurnoActionClick = async (event) => {
        const deleteBtn = event.target.closest('button[data-action="delete-turno"]');
        const statusBtn = event.target.closest('button[data-action="mark-turno-status"]');
        const viewPhotosBtn = event.target.closest('button[data-action="view-turno-fotos"]');

        if (viewPhotosBtn) {
            openTurnoFotoModal(viewPhotosBtn.dataset.id);
            return;
        }

        if (statusBtn) {
            try {
                await actualizarEstadoTurno(statusBtn.dataset.id, statusBtn.dataset.status);
                showMessage(`Turno marcado como ${getTurnoEstadoLabel(statusBtn.dataset.status).toLowerCase()}`);
            } catch (error) {
                showMessage(error.message, 'error');
            }
            return;
        }

        if (deleteBtn) {
            if (!confirm('Eliminar este turno?')) {
                return;
            }

            try {
                await apiFetch(`/api/turnos/${deleteBtn.dataset.id}`, { method: 'DELETE' });
                await Promise.all([
                    cargarTurnos(),
                    cargarTurnosDelMomento({ silent: true }),
                    !isAgendaRole() ? cargarDashboard() : Promise.resolve()
                ]);
                showMessage('Turno eliminado');
            } catch (error) {
                showMessage(error.message, 'error');
            }
        }
    };

    $('turnosTableBody').addEventListener('click', handleTurnoActionClick);
    $('turnosAhoraList').addEventListener('click', handleTurnoActionClick);

    $('peluqueroForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const id = $('peluqueroId').value;
            const payload = {
                nombre: $('peluqueroNombre').value.trim(),
                telefono: $('peluqueroTelefono').value.trim(),
                fechaCumpleanos: $('peluqueroFechaCumple').value,
                porcentajeComision: Number($('peluqueroComision').value),
                agenda: readPeluqueroAgenda(),
                activo: $('peluqueroActivo').checked
            };

            if (id) {
                await apiFetch(`/api/peluqueros/${id}`, { method: 'PUT', body: payload });
                showMessage('Peluquero actualizado');
            } else {
                await apiFetch('/api/peluqueros', { method: 'POST', body: payload });
                showMessage('Peluquero creado');
            }

            resetPeluqueroForm();
            await Promise.all([cargarPeluqueros(), cargarDashboard()]);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cancelEditPeluquero').addEventListener('click', () => {
        resetPeluqueroForm();
    });

    $('peluquerosTableBody').addEventListener('click', async (event) => {
        const editBtn = event.target.closest('button[data-action="edit-peluquero"]');
        const deleteBtn = event.target.closest('button[data-action="delete-peluquero"]');

        if (editBtn) {
            fillPeluqueroForm(editBtn.dataset.id);
            return;
        }

        if (!deleteBtn) {
            return;
        }

        if (!confirm('Eliminar este peluquero?')) {
            return;
        }

        try {
            await apiFetch(`/api/peluqueros/${deleteBtn.dataset.id}`, { method: 'DELETE' });
            await Promise.all([cargarPeluqueros(), cargarDashboard()]);
            showMessage('Peluquero eliminado');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('servicioForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const id = $('servicioId').value;
            const payload = {
                nombre: $('servicioNombre').value.trim(),
                precio: Number($('servicioPrecio').value),
                duracionMinutos: Number($('servicioDuracion').value)
            };

            if (id) {
                await apiFetch(`/api/servicios/${id}`, { method: 'PUT', body: payload });
                showMessage('Servicio actualizado');
            } else {
                await apiFetch('/api/servicios', { method: 'POST', body: payload });
                showMessage('Servicio creado');
            }

            resetServicioForm();
            await cargarServiciosCaja();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cancelEditServicio').addEventListener('click', () => {
        resetServicioForm();
    });

    $('serviciosTableBody').addEventListener('click', async (event) => {
        const editBtn = event.target.closest('button[data-action="edit-servicio"]');
        const deleteBtn = event.target.closest('button[data-action="delete-servicio"]');

        if (editBtn) {
            fillServicioForm(editBtn.dataset.id);
            return;
        }

        if (!deleteBtn) {
            return;
        }

        if (!confirm('Eliminar este servicio?')) {
            return;
        }

        try {
            await apiFetch(`/api/servicios/${deleteBtn.dataset.id}`, { method: 'DELETE' });
            await cargarServiciosCaja();
            showMessage('Servicio eliminado');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cajaServicio').addEventListener('change', () => {
        syncCajaMontoByServicio();
    });

    $('cajaForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const servicioId = $('cajaServicio').value;
            if (!servicioId) {
                throw new Error('Debes seleccionar un servicio');
            }

            await apiFetch('/api/atenciones', {
                method: 'POST',
                body: {
                    fecha: $('cajaFecha').value,
                    peluqueroId: $('cajaPeluquero').value,
                    cliente: $('cajaCliente').value.trim(),
                    formaPago: $('cajaFormaPago').value,
                    servicioId
                }
            });

            $('cajaCliente').value = '';
            $('cajaFormaPago').value = 'efectivo';
            renderCajaServiciosSelect();
            showMessage('Venta registrada en caja');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cargarReporteDia').addEventListener('click', async () => {
        try {
            await cargarReporteDia();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('reporteFechaDia').addEventListener('change', async () => {
        try {
            await cargarReporteDia();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('reportePeluquero').addEventListener('change', async () => {
        try {
            await cargarReporteDia();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('exportarReporteDiaExcel').addEventListener('click', async () => {
        try {
            const fecha = $('reporteFechaDia').value;
            if (!fecha) {
                throw new Error('Selecciona una fecha para exportar el reporte diario');
            }

            await cargarReporteDia();

            const peluqueroId = $('reportePeluquero').value || '';
            const params = new URLSearchParams({ fecha });
            if (peluqueroId) {
                params.set('peluqueroId', peluqueroId);
            }
            await downloadFile(`/api/reportes/caja-diario-excel?${params.toString()}`, `reporte_caja_${fecha}.xlsx`);
            showMessage('Excel diario descargado');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('exportarReporteSemanalExcel').addEventListener('click', async () => {
        try {
            const desde = $('reporteSemanaDesde').value;
            const hasta = $('reporteSemanaHasta').value;
            validarRangoReportes(desde, hasta);

            const params = new URLSearchParams({ desde, hasta });
            await downloadFile(
                `/api/reportes/caja-rango-excel?${params.toString()}`,
                `reporte_semanal_${desde}_a_${hasta}.xlsx`
            );
            showMessage('Excel semanal descargado');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('usuarioForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            await apiFetch('/api/users', {
                method: 'POST',
                body: {
                    username: $('usuarioNombre').value.trim(),
                    password: $('usuarioPassword').value,
                    role: $('usuarioRol').value
                }
            });

            $('usuarioForm').reset();
            await cargarUsuarios();
            showMessage('Usuario creado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('usuariosTableBody').addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action="edit-user"]');
        if (!button) {
            return;
        }

        const userId = button.dataset.id;
        const user = state.usuarios.find((item) => String(item._id || item.id) === String(userId));
        if (!user) {
            showMessage('Usuario no encontrado', 'error');
            return;
        }

        openEditarUsuarioModal(user);
    });

    $('cancelEditarUsuario').addEventListener('click', () => {
        closeEditarUsuarioModal();
    });

    $('editarUsuarioModal').addEventListener('click', (event) => {
        if (event.target.id === 'editarUsuarioModal') {
            closeEditarUsuarioModal();
        }
    });

    $('editarUsuarioForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const userId = $('editarUsuarioId').value;
        const username = $('editarUsuarioNombre').value.trim();
        const role = $('editarUsuarioRol').value;
        const password = $('editarUsuarioPassword').value;

        if (!userId) {
            showMessage('Usuario no seleccionado', 'error');
            return;
        }

        if (username.length < 3) {
            showMessage('El usuario debe tener al menos 3 caracteres', 'error');
            return;
        }

        try {
            await apiFetch(`/api/users/${userId}`, {
                method: 'PUT',
                body: {
                    username,
                    role,
                    password: String(password || '').trim()
                }
            });

            await cargarUsuarios();
            closeEditarUsuarioModal();
            showMessage('Usuario actualizado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

function setDefaultDates() {
    const value = today();
    const turnoDefaultDate = nextOpenDate(value);
    const monday = getMondayDateString(value);
    $('dashboardDate').value = value;
    $('turnoFecha').value = turnoDefaultDate;
    $('turnoHora').value = '10:00';
    $('turnosFiltroFecha').value = value;
    $('cajaFecha').value = value;
    setCurrentCumpleMonth(value.slice(0, 7));
    state.selectedCumpleDate = null;
    $('reporteFechaDia').value = value;
    $('reporteSemanaDesde').value = monday;
    $('reporteSemanaHasta').value = value;
    applyTurnoDateTimeConstraints();
}

async function init() {
    setDefaultDates();
    resetPeluqueroForm();
    resetServicioForm();
    attachEvents();
    await restoreSession();
}

init();
