const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const MAX_IMAGE_DIMENSION = 1280;
const TARGET_IMAGE_BYTES = 950 * 1024;
const MIN_IMAGE_DIMENSION = 640;
const MIN_JPEG_QUALITY = 0.5;

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
    const options = state.peluqueros
        .filter((p) => p.activo)
        .map((p) => `<option value="${p._id}">${escapeHtml(p.nombre)}</option>`)
        .join('');

    $('turnoPeluquero').innerHTML = options;
    $('cajaPeluquero').innerHTML = options;
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

    body.innerHTML = state.turnos.map((t) => {
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
    const datalist = $('clientesDatalist');
    if (!datalist) {
        return;
    }

    datalist.innerHTML = state.clientes
        .map((cliente) => `<option value="${escapeHtml(cliente.nombre)}"></option>`)
        .join('');
}

function renderClientesList() {
    const list = $('clientesList');
    const search = normalizeText($('clientesSearch')?.value || '');

    const visibles = state.clientes.filter((cliente) => (
        normalizeText(cliente.nombre).includes(search)
    ));

    if (!visibles.length) {
        list.innerHTML = '<p class="cliente-vacio">No hay clientes cargados.</p>';
        return;
    }

    list.innerHTML = visibles.map((cliente) => `
        <div class="cliente-item ${state.selectedClienteId === cliente._id ? 'active' : ''}" data-action="select-cliente" data-id="${cliente._id}">
            <strong>${escapeHtml(cliente.nombre)}</strong>
            <small>${cliente.ultimaAtencion ? `Ultima atencion: ${escapeHtml(cliente.ultimaAtencion)}` : 'Sin atenciones'}</small>
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
    $('clienteUltimaAtencion').textContent = cliente.ultimaAtencion || '-';

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

function renderCajaTable() {
    const body = $('cajaTableBody');

    body.innerHTML = state.atenciones.map((a) => `
        <tr>
            <td>${a.fecha}</td>
            <td>${escapeHtml(a.peluquero?.nombre || '-')}</td>
            <td>${escapeHtml(a.cliente || '-')}</td>
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
            <td>${escapeHtml(u.role)}</td>
            <td>${new Date(u.createdAt).toLocaleDateString('es-AR')}</td>
        </tr>
    `).join('');
}

function renderReportes(data) {
    const container = $('reportesContainer');

    if (!data.length) {
        container.innerHTML = '<p>No hay datos para el rango seleccionado.</p>';
        return;
    }

    container.innerHTML = data.map((group) => `
        <article class="report-card">
            <div class="report-header">
                <strong>${escapeHtml(group.peluqueroNombre)}</strong>
                <span>Total cobrado: $${group.totalCobrado.toFixed(2)} | Total comision: $${group.totalComision.toFixed(2)}</span>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Monto</th>
                            <th>Comision</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.registros.map((r) => `
                            <tr>
                                <td>${r.fecha}</td>
                                <td>${escapeHtml(r.cliente || '-')}</td>
                                <td>$${Number(r.montoCobrado).toFixed(2)}</td>
                                <td>$${Number(r.comisionGanada).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </article>
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

async function convertirImagenABase64(file) {
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

async function processTurnoPhoto(slot) {
    const refs = getTurnoPhotoRefs(slot);
    const file = refs.input.files && refs.input.files[0] ? refs.input.files[0] : null;

    if (!file) {
        return;
    }

    try {
        setTurnoPhotoStatus(slot, 'Procesando imagen...');
        const base64 = await convertirImagenABase64(file);
        refs.input.dataset.base64 = base64;
        refs.preview.src = base64;
        refs.preview.classList.remove('hidden');
        const kb = Math.round(estimarBytesDesdeDataURL(base64) / 1024);
        setTurnoPhotoStatus(slot, `Lista (${kb} KB)`);
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
        const base64 = await convertirImagenABase64(file);
        refs.input.dataset.base64 = base64;
        refs.preview.src = base64;
        refs.preview.classList.remove('hidden');
        const kb = Math.round(estimarBytesDesdeDataURL(base64) / 1024);
        setClientePhotoStatus(slot, `Lista (${kb} KB)`);
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

async function cargarConfig() {
    try {
        const config = await apiFetch('/api/config', { auth: false });
        if (config?.servicios) {
            state.servicios = config.servicios;
        }
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
}

async function cargarTurnos() {
    const fecha = $('turnosFiltroFecha').value;
    state.turnos = await apiFetch(`/api/turnos?fecha=${fecha}`);
    renderTurnosTable();
}

async function cargarAtenciones() {
    const desde = $('cajaFecha').value;
    state.atenciones = await apiFetch(`/api/atenciones?desde=${desde}`);
    renderCajaTable();
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
            cargarAtenciones(),
            cargarUsuarios()
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

    $('turnoForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const foto1 = await getProcessedTurnoPhoto('1');
            const foto2 = await getProcessedTurnoPhoto('2');
            const clienteNombre = $('turnoCliente').value.trim();
            const clienteCoincidente = state.clientes.find((cliente) => (
                normalizeText(cliente.nombre) === normalizeText(clienteNombre)
            ));

            await apiFetch('/api/turnos', {
                method: 'POST',
                body: {
                    fecha: $('turnoFecha').value,
                    hora: $('turnoHora').value,
                    peluqueroId: $('turnoPeluquero').value,
                    servicio: $('turnoServicio').value,
                    cliente: clienteNombre,
                    clienteId: clienteCoincidente?._id || null,
                    foto1,
                    foto2
                }
            });

            $('turnoCliente').value = '';
            clearTurnoPhotos();
            await Promise.all([
                cargarTurnos(),
                cargarClientes(),
                !isAgendaRole() ? cargarDashboard() : Promise.resolve()
            ]);
            showMessage('Turno guardado correctamente');
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
            const nombre = $('clienteNombreInput').value.trim();
            const apellido = $('clienteApellidoInput').value.trim();

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
                    telefono: $('clienteTelefonoInput').value.trim(),
                    instagram: $('clienteInstagramInput').value.trim(),
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
                    montoCobrado: Number($('cajaMonto').value)
                }
            });

            $('cajaCliente').value = '';
            $('cajaMonto').value = '';

            await Promise.all([cargarAtenciones(), cargarDashboard()]);
            showMessage('Atencion registrada');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    $('cargarReporte').addEventListener('click', async () => {
        try {
            const desde = $('reporteDesde').value;
            const hasta = $('reporteHasta').value;
            const data = await apiFetch(`/api/reportes/peluqueros?desde=${desde}&hasta=${hasta}`);
            renderReportes(data);
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
}

function setDefaultDates() {
    const value = today();
    $('dashboardDate').value = value;
    $('turnoFecha').value = value;
    $('turnosFiltroFecha').value = value;
    $('cajaFecha').value = value;
    $('reporteDesde').value = value;
    $('reporteHasta').value = value;
}

async function init() {
    setDefaultDates();
    resetPeluqueroForm();
    attachEvents();
    await restoreSession();
}

init();
