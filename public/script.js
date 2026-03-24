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
    clientes: [],
    selectedClienteId: null,
    selectedTurnoClienteId: null,
    pendingTurnoPayload: null,
    atenciones: [],
    usuarios: []
};

const $ = (id) => document.getElementById(id);

function today() {
    return new Date().toISOString().slice(0, 10);
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

function normalizeDni(value) {
    return String(value || '').replace(/\D/g, '').trim();
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
    return Number(state.servicios[servicio]?.durationMinutes || 30);
}

function getTurnoLastStartMinutes() {
    const servicio = $('turnoServicio')?.value || 'corte';
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
    box.textContent = message;
    box.className = `message ${type}`;
    box.classList.remove('hidden');

    setTimeout(() => {
        box.classList.add('hidden');
    }, 3500);
}

async function apiFetch(url, options = {}) {
    const {
        auth = true,
        method = 'GET',
        body,
        headers = {}
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
}

async function downloadFile(url, fallbackName) {
    const headers = {};
    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

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

    const options = activos
        .map((p) => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`)
        .join('');

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

function renderPeluquerosTable() {
    const body = $('peluquerosTableBody');

    body.innerHTML = state.peluqueros.map((p) => `
        <tr>
            <td>${escapeHtml(p.nombre)}</td>
            <td>${escapeHtml(p.telefono || '-')}</td>
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

function renderTurnosTable() {
    const body = $('turnosTableBody');
    const peluqueroSeleccionado = $('turnosFiltroPeluquero')?.value || '';
    const turnosVisibles = state.turnos.filter((turno) => {
        if (!peluqueroSeleccionado) {
            return true;
        }
        return String(turno.peluquero?._id || '') === String(peluqueroSeleccionado);
    });

    if (!turnosVisibles.length) {
        body.innerHTML = '<tr><td colspan="6">No hay reservas para ese filtro.</td></tr>';
        return;
    }

    body.innerHTML = turnosVisibles.map((t) => {
        const servicio = state.servicios[t.servicio]?.label || t.servicio;
        const hasPhotos = Boolean(t.foto1 || t.foto2);
        const fotosCell = hasPhotos
            ? `<button class="btn photo-thumb-btn" type="button" data-action="view-turno-fotos" data-id="${t._id}">Ver fotos</button>`
            : '-';

        const actionCell = isAgendaRole()
            ? '-'
            : `<button class="btn danger" type="button" data-action="delete-turno" data-id="${t._id}">Eliminar</button>`;

        return `
            <tr>
                <td>${t.horaInicio} - ${t.horaFin}</td>
                <td>${escapeHtml(t.peluquero?.nombre || '-')}</td>
                <td>${escapeHtml(servicio)}</td>
                <td>${escapeHtml(t.cliente || '-')}</td>
                <td>${fotosCell}</td>
                <td>${actionCell}</td>
            </tr>
        `;
    }).join('');
}

function completarClientesDatalist() {
    const options = state.clientes
        .map((cliente) => (
            `<option value="${escapeHtml(cliente.nombre)}" label="Tel ${escapeHtml(cliente.telefono || '-')} | DNI ${escapeHtml(cliente.dni || '-')}"></option>`
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
    const searchDni = normalizeDni(rawSearch);

    const visibles = state.clientes.filter((cliente) => {
        const byName = normalizeText(cliente.nombre).includes(search);
        const byDni = searchDni ? normalizeDni(cliente.dni).includes(searchDni) : false;
        const byPhone = searchDni ? normalizeDni(cliente.telefono).includes(searchDni) : false;
        return byName || byDni || byPhone;
    });

    if (!visibles.length) {
        list.innerHTML = '<p class="cliente-vacio">No hay clientes cargados.</p>';
        return;
    }

    list.innerHTML = visibles.map((cliente) => `
        <div class="cliente-item ${state.selectedClienteId === cliente._id ? 'active' : ''}" data-action="select-cliente" data-id="${cliente._id}">
            <strong>${escapeHtml(cliente.nombre)}</strong>
            <small>DNI: ${escapeHtml(cliente.dni || '-')}</small>
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
        clearClienteEditPhotos();
        return;
    }

    $('clienteDetalleVacio').classList.add('hidden');
    $('clienteDetalle').classList.remove('hidden');
    $('clienteNombre').textContent = cliente.nombre || '-';
    $('clienteDni').textContent = cliente.dni || '-';
    $('clienteTelefono').textContent = cliente.telefono || '-';
    $('clienteInstagram').textContent = cliente.instagram || '-';
    $('clienteFechaCumple').textContent = cliente.fechaCumpleanos || '-';
    $('clienteUltimaAtencion').textContent = cliente.ultimaAtencion || '-';
    $('clienteUltimaAtencionPeluquero').textContent = cliente.ultimaAtencionPeluquero || '-';
    clearClienteEditPhotos();

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

function selectCliente(clienteId) {
    state.selectedClienteId = clienteId;
    renderClientesList();
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
        $('turnoClienteInfoDni').textContent = '-';
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
    $('turnoClienteInfoDni').textContent = cliente.dni || '-';
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
    return cliente;
}

function openNuevoClienteTurnoModal(nombreCompleto) {
    const modal = $('nuevoClienteTurnoModal');
    const parsed = splitFullName(nombreCompleto);
    $('nuevoClienteTurnoNombre').value = parsed.nombre;
    $('nuevoClienteTurnoApellido').value = parsed.apellido;
    $('nuevoClienteTurnoDni').value = '';
    $('nuevoClienteTurnoTelefono').value = '';
    $('nuevoClienteTurnoInstagram').value = '';
    $('nuevoClienteTurnoFechaCumple').value = '';
    modal.classList.remove('hidden');
}

function closeNuevoClienteTurnoModal() {
    $('nuevoClienteTurnoModal').classList.add('hidden');
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
    $('peluqueroComision').value = '40';
    $('peluqueroInicio').value = '10:00';
    $('peluqueroFin').value = '22:00';
    $('peluqueroActivo').checked = true;
    document.querySelectorAll('.day-check').forEach((check) => {
        check.checked = Number(check.value) >= 1 && Number(check.value) <= 6;
    });
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

function getClienteEditPhotoRefs(slot) {
    if (slot === '1') {
        return {
            input: $('clienteEditFoto1Input'),
            preview: $('clienteEditFoto1Preview'),
            status: $('clienteEditFoto1Estado')
        };
    }

    return {
        input: $('clienteEditFoto2Input'),
        preview: $('clienteEditFoto2Preview'),
        status: $('clienteEditFoto2Estado')
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

function setClienteEditPhotoStatus(slot, message, isError = false) {
    const { status } = getClienteEditPhotoRefs(slot);
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

async function processClienteEditPhoto(slot) {
    const refs = getClienteEditPhotoRefs(slot);
    const file = refs.input.files && refs.input.files[0] ? refs.input.files[0] : null;

    if (!file) {
        return;
    }

    try {
        setClienteEditPhotoStatus(slot, 'Procesando imagen...');
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
        setClienteEditPhotoStatus(slot, `Lista (${kb} KB)${suffix}`);
    } catch (error) {
        refs.input.value = '';
        delete refs.input.dataset.base64;
        refs.preview.src = '';
        refs.preview.classList.add('hidden');
        setClienteEditPhotoStatus(slot, error.message, true);
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

async function getProcessedClienteEditPhoto(slot) {
    const refs = getClienteEditPhotoRefs(slot);

    if (refs.input.dataset.base64) {
        return refs.input.dataset.base64;
    }

    if (refs.input.files && refs.input.files[0]) {
        await processClienteEditPhoto(slot);
        return refs.input.dataset.base64 || '';
    }

    return '';
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

function clearClienteEditPhotos() {
    ['1', '2'].forEach((slot) => {
        const refs = getClienteEditPhotoRefs(slot);

        if (!refs.input || !refs.preview || !refs.status) {
            return;
        }

        refs.input.value = '';
        delete refs.input.dataset.base64;
        refs.preview.src = '';
        refs.preview.classList.add('hidden');
        setClienteEditPhotoStatus(slot, '');
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

function openClienteEditPhotoPicker(slot, source) {
    const refs = getClienteEditPhotoRefs(slot);
    refs.input.value = '';
    delete refs.input.dataset.base64;

    if (source === 'camera') {
        refs.input.setAttribute('capture', 'environment');
        setClienteEditPhotoStatus(slot, 'Abriendo camara...');
    } else {
        refs.input.removeAttribute('capture');
        setClienteEditPhotoStatus(slot, 'Selecciona una imagen de la galeria');
    }

    refs.input.click();
}

window.openClienteEditPhotoPicker = openClienteEditPhotoPicker;

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
        cargarClientes(),
        !isAgendaRole() ? cargarDashboard() : Promise.resolve()
    ]);
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
}

async function cargarClientes() {
    state.clientes = await apiFetch('/api/clientes');
    completarClientesDatalist();
    renderClientesList();

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
    await cargarConfig();
    await cargarPeluqueros();
    await cargarClientes();
    await cargarTurnos();

    if (!isAgendaRole()) {
        await Promise.all([
            cargarDashboard(),
            cargarUsuarios(),
            cargarReporteDia()
        ]);
    }
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
    } catch (error) {
        localStorage.removeItem('agendaToken');
        localStorage.removeItem('agendaUser');
        state.token = null;
        state.user = null;
        showLogin();
    }
}

function attachEvents() {
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

    $('clienteEditFoto1Input').addEventListener('change', async () => {
        try {
            await processClienteEditPhoto('1');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('clienteEditFoto2Input').addEventListener('change', async () => {
        try {
            await processClienteEditPhoto('2');
        } catch (error) {
            showMessage(error.message, 'error');
        }
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
            await cargarTodoInicial();
            showMessage('Sesion iniciada correctamente');
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

    $('turnoCliente').addEventListener('input', () => {
        syncTurnoClienteByInput();
    });

    $('turnoCliente').addEventListener('blur', () => {
        syncTurnoClienteByInput();
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
                peluqueroId: $('turnoPeluquero').value,
                servicio: servicioTurno,
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
                    dni: $('nuevoClienteTurnoDni').value.trim(),
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

    $('reloadClientes').addEventListener('click', async () => {
        try {
            await cargarClientes();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('clientesSearch').addEventListener('input', () => {
        renderClientesList();
    });

    $('clientesList').addEventListener('click', (event) => {
        const item = event.target.closest('[data-action=\"select-cliente\"]');
        if (!item) {
            return;
        }
        selectCliente(item.dataset.id);
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

    $('guardarFotosClienteSeleccionado').addEventListener('click', async () => {
        try {
            const clienteId = state.selectedClienteId;
            if (!clienteId) {
                throw new Error('Selecciona un cliente para actualizar fotos');
            }

            const foto1 = await getProcessedClienteEditPhoto('1');
            const foto2 = await getProcessedClienteEditPhoto('2');

            const body = {};
            if (foto1) {
                body.foto1 = foto1;
            }
            if (foto2) {
                body.foto2 = foto2;
            }

            if (!Object.keys(body).length) {
                throw new Error('Selecciona al menos una foto para actualizar');
            }

            await apiFetch(`/api/clientes/${clienteId}/fotos`, {
                method: 'PUT',
                body
            });

            await cargarClientes();
            showMessage('Fotos del cliente actualizadas');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('clienteForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const nombre = $('clienteNombreInput').value.trim();
            const apellido = $('clienteApellidoInput').value.trim();
            const dni = $('clienteDniInput').value.trim();

            if (!nombre || !apellido) {
                throw new Error('Nombre y apellido son obligatorios');
            }

            const foto1 = await getProcessedClientePhoto('1');
            const foto2 = await getProcessedClientePhoto('2');

            if (!foto1 || !foto2) {
                throw new Error('Debes cargar las 2 fotos del cliente');
            }

            const saved = await apiFetch('/api/clientes', {
                method: 'POST',
                body: {
                    nombre,
                    apellido,
                    dni,
                    telefono: $('clienteTelefonoInput').value.trim(),
                    instagram: $('clienteInstagramInput').value.trim(),
                    fechaCumpleanos: $('clienteFechaCumpleInput').value,
                    foto1,
                    foto2
                }
            });

            $('clienteForm').reset();
            clearClientePhotos();
            if (saved?._id) {
                state.selectedClienteId = saved._id;
            }
            await cargarClientes();
            showMessage('Cliente guardado correctamente');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('turnosTableBody').addEventListener('click', async (event) => {
        const deleteBtn = event.target.closest('button[data-action="delete-turno"]');
        const viewPhotosBtn = event.target.closest('button[data-action="view-turno-fotos"]');

        if (viewPhotosBtn) {
            openTurnoFotoModal(viewPhotosBtn.dataset.id);
            return;
        }

        if (!deleteBtn) {
            return;
        }

        if (!confirm('Eliminar este turno?')) {
            return;
        }

        try {
            await apiFetch(`/api/turnos/${deleteBtn.dataset.id}`, { method: 'DELETE' });
            await Promise.all([cargarTurnos(), !isAgendaRole() ? cargarDashboard() : Promise.resolve()]);
            showMessage('Turno eliminado');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('peluqueroForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const id = $('peluqueroId').value;
            const payload = {
                nombre: $('peluqueroNombre').value.trim(),
                telefono: $('peluqueroTelefono').value.trim(),
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

    $('cajaForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            await apiFetch('/api/atenciones', {
                method: 'POST',
                body: {
                    fecha: $('cajaFecha').value,
                    peluqueroId: $('cajaPeluquero').value,
                    cliente: $('cajaCliente').value.trim(),
                    formaPago: $('cajaFormaPago').value,
                    montoCobrado: Number($('cajaMonto').value)
                }
            });

            $('cajaCliente').value = '';
            $('cajaFormaPago').value = 'efectivo';
            $('cajaMonto').value = '';
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
    $('reporteFechaDia').value = value;
    $('reporteSemanaDesde').value = monday;
    $('reporteSemanaHasta').value = value;
    applyTurnoDateTimeConstraints();
}

async function init() {
    setDefaultDates();
    resetPeluqueroForm();
    attachEvents();
    await restoreSession();
}

init();
