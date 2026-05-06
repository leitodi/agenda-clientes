const state = {
    business: null,
    services: [],
    barbers: [],
    clientMode: 'existing',
    existingClients: [],
    selectedClient: null,
    newClientDraft: null,
    availableDays: [],
    availableSlots: [],
    selectedDate: '',
    selectedTime: '',
    selectedSlotBarberName: '',
    minDate: ''
};

const $ = (id) => document.getElementById(id);

const elements = {
    brandName: $('brandName'),
    heroTitle: $('heroTitle'),
    heroSubtitle: $('heroSubtitle'),
    businessHours: $('businessHours'),
    businessInstagram: $('businessInstagram'),
    businessAddress: $('businessAddress'),
    businessContactText: $('businessContactText'),
    serviceSelect: $('serviceSelect'),
    barberSelect: $('barberSelect'),
    bookingDate: $('bookingDate'),
    timeSelect: $('timeSelect'),
    availabilityInfo: $('availabilityInfo'),
    bookingForm: $('bookingForm'),
    bookingMessage: $('bookingMessage'),
    existingClientModeBtn: $('existingClientModeBtn'),
    newClientModeBtn: $('newClientModeBtn'),
    existingClientPanel: $('existingClientPanel'),
    newClientPanel: $('newClientPanel'),
    existingClientSearch: $('existingClientSearch'),
    existingClientResults: $('existingClientResults'),
    selectedExistingClient: $('selectedExistingClient'),
    openNewClientModalBtn: $('openNewClientModalBtn'),
    newClientSummary: $('newClientSummary'),
    newClientModal: $('newClientModal'),
    newClientModalForm: $('newClientModalForm'),
    closeNewClientModalBtn: $('closeNewClientModalBtn'),
    customerName: $('customerName'),
    customerPhone: $('customerPhone'),
    customerInstagram: $('customerInstagram'),
    submitBooking: $('submitBooking'),
    refreshAvailability: $('refreshAvailability'),
    carouselTrack: $('carouselTrack'),
    carouselDots: $('carouselDots'),
    prevSlide: $('prevSlide'),
    nextSlide: $('nextSlide')
};

let carouselIndex = 0;
let carouselTimer = null;
let clientSearchTimer = null;
let clientSearchSequence = 0;

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    let payload = null;

    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo completar la solicitud');
    }

    return payload;
}

function showMessage(message, type = 'success') {
    elements.bookingMessage.textContent = message;
    elements.bookingMessage.className = `booking-message is-${type}`;
    elements.bookingMessage.classList.remove('hidden');
}

function hideMessage() {
    elements.bookingMessage.classList.add('hidden');
    elements.bookingMessage.textContent = '';
    elements.bookingMessage.className = 'booking-message hidden';
}

function renderBusinessInfo() {
    if (!state.business) {
        return;
    }

    if (elements.brandName) {
        elements.brandName.textContent = state.business.name;
    }

    if (elements.heroTitle) {
        elements.heroTitle.textContent = state.business.subtitle;
    }

    if (elements.heroSubtitle) {
        elements.heroSubtitle.textContent = 'Elige servicio, cliente, fecha y horario. Si no eliges peluquero, te asignamos el primero disponible.';
    }

    if (elements.businessHours) {
        elements.businessHours.textContent = state.business.openingHours;
    }

    if (elements.businessInstagram) {
        elements.businessInstagram.textContent = state.business.instagram || 'Sin Instagram';
    }

    if (elements.businessAddress) {
        elements.businessAddress.textContent = 'Horario de lunes a sabados de 9 a 22';
    }

    if (elements.businessContactText) {
        elements.businessContactText.textContent = state.business.phone
        ? `Telefono de contacto: ${state.business.phone}`
        : 'Agenda abierta para cortes, barba y servicios de peluqueria.';
    }
}

function renderServiceOptions() {
    if (!state.services.length) {
        elements.serviceSelect.innerHTML = '<option value="">Sin servicios disponibles</option>';
        return;
    }

    elements.serviceSelect.innerHTML = state.services
        .map((service) => (
            `<option value="${service._id}">${service.nombre} - ${service.duracionMinutos} min</option>`
        ))
        .join('');
}

function renderBarberOptions() {
    const options = ['<option value="">Primero disponible</option>']
        .concat(state.barbers.map((barber) => (
            `<option value="${barber._id}">${barber.nombre}</option>`
        )))
        .join('');

    elements.barberSelect.innerHTML = options;
}

function renderExistingClientResults(query = '') {
    const normalizedQuery = String(query || '').trim();

    if (normalizedQuery.length < 2) {
        elements.existingClientResults.innerHTML = '';
        elements.existingClientResults.classList.add('hidden');
        return;
    }

    if (!state.existingClients.length) {
        elements.existingClientResults.innerHTML = '<div class="client-results-empty">No encontramos clientes con ese nombre.</div>';
        elements.existingClientResults.classList.remove('hidden');
        return;
    }

    elements.existingClientResults.innerHTML = state.existingClients
        .map((client) => (
            `<button type="button" class="client-result-btn${state.selectedClient?._id === client._id ? ' is-active' : ''}" data-client-id="${client._id}">${client.nombre}</button>`
        ))
        .join('');
    elements.existingClientResults.classList.remove('hidden');
}

function renderClientMode() {
    const isExisting = state.clientMode === 'existing';
    elements.existingClientModeBtn.classList.toggle('is-active', isExisting);
    elements.newClientModeBtn.classList.toggle('is-active', !isExisting);
    elements.existingClientPanel.classList.toggle('hidden', !isExisting);
    elements.newClientPanel.classList.toggle('hidden', isExisting);
    renderNewClientSummary();
}

function renderSelectedClient() {
    if (state.clientMode !== 'existing' || !state.selectedClient) {
        elements.selectedExistingClient.classList.add('hidden');
        elements.selectedExistingClient.textContent = '';
        return;
    }

    elements.selectedExistingClient.textContent = `Cliente seleccionado: ${state.selectedClient.nombre}`;
    elements.selectedExistingClient.classList.remove('hidden');
    elements.existingClientSearch.value = state.selectedClient.nombre;
    elements.existingClientResults.classList.add('hidden');
}

function clearSelectedClient() {
    state.selectedClient = null;
    state.existingClients = [];
    elements.existingClientSearch.value = '';
    elements.existingClientResults.innerHTML = '';
    elements.existingClientResults.classList.add('hidden');
    renderSelectedClient();
}

function renderNewClientSummary() {
    if (state.clientMode !== 'new' || !state.newClientDraft) {
        elements.newClientSummary.classList.add('hidden');
        elements.newClientSummary.textContent = '';
        return;
    }

    elements.newClientSummary.textContent = `${state.newClientDraft.nombre} - ${state.newClientDraft.telefono}`;
    elements.newClientSummary.classList.remove('hidden');
}

function openNewClientModal() {
    elements.customerName.value = state.newClientDraft?.nombre || '';
    elements.customerPhone.value = state.newClientDraft?.telefono || '';
    elements.customerInstagram.value = state.newClientDraft?.instagram || '';
    elements.newClientModal.classList.remove('hidden');
}

function closeNewClientModal() {
    elements.newClientModal.classList.add('hidden');
}

function getSelectedService() {
    return state.services.find((service) => service._id === elements.serviceSelect.value) || null;
}

function getSelectedBarberName() {
    const barber = state.barbers.find((item) => item._id === elements.barberSelect.value);
    return barber ? barber.nombre : 'Primero disponible';
}

function renderAvailabilityInfo(message = '', visible = false) {
    elements.availabilityInfo.textContent = message;
    elements.availabilityInfo.classList.toggle('hidden', !visible);
}

function renderTimeOptions() {
    if (!state.availableSlots.length) {
        elements.timeSelect.innerHTML = '<option value="">Sin horarios disponibles</option>';
        return;
    }

    elements.timeSelect.innerHTML = [
        '<option value="">Selecciona un horario</option>',
        ...state.availableSlots.map((slot) => (
            `<option value="${slot.hora}">${slot.hora}</option>`
        ))
    ].join('');

    if (state.selectedTime && state.availableSlots.some((slot) => slot.hora === state.selectedTime)) {
        elements.timeSelect.value = state.selectedTime;
    }
}

function setLoadingState(isLoading) {
    elements.submitBooking.disabled = isLoading;
    elements.refreshAvailability.disabled = isLoading;
    elements.serviceSelect.disabled = isLoading;
    elements.barberSelect.disabled = isLoading;
    elements.bookingDate.disabled = isLoading;
    elements.timeSelect.disabled = isLoading;
    elements.existingClientSearch.disabled = isLoading;
}

async function loadExistingClients(query) {
    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery.length < 2) {
        state.existingClients = [];
        renderExistingClientResults('');
        return;
    }

    const payload = await fetchJson(`/api/public/clients?q=${encodeURIComponent(normalizedQuery)}&limit=12`);
    state.existingClients = payload.clients || [];
    renderExistingClientResults(normalizedQuery);
}

function scheduleExistingClientSearch() {
    window.clearTimeout(clientSearchTimer);

    const query = elements.existingClientSearch.value.trim();
    if (query.length < 2) {
        state.selectedClient = null;
        state.existingClients = [];
        renderSelectedClient();
        renderExistingClientResults('');
        return;
    }

    const sequence = clientSearchSequence + 1;
    clientSearchSequence = sequence;

    clientSearchTimer = window.setTimeout(async () => {
        try {
            await loadExistingClients(query);
            if (sequence !== clientSearchSequence) {
                return;
            }
        } catch (error) {
            if (sequence !== clientSearchSequence) {
                return;
            }

            showMessage(error.message, 'error');
        }
    }, 220);
}

async function loadAvailabilityDays() {
    const service = getSelectedService();
    state.availableDays = [];
    state.availableSlots = [];
    state.selectedTime = '';
    state.selectedSlotBarberName = '';
    renderTimeOptions();

    if (!service) {
        state.selectedDate = '';
        elements.bookingDate.value = '';
        renderAvailabilityInfo('', false);
        return;
    }

    const params = new URLSearchParams({
        serviceId: service._id,
        from: state.minDate,
        days: '30'
    });

    if (elements.barberSelect.value) {
        params.set('barberId', elements.barberSelect.value);
    }

    renderAvailabilityInfo('Buscando dias disponibles...', true);
    const payload = await fetchJson(`/api/public/availability/days?${params.toString()}`);
    state.availableDays = payload.days || [];

    const stillExists = state.availableDays.some((day) => day.fecha === state.selectedDate);
    state.selectedDate = stillExists
        ? state.selectedDate
        : state.availableDays[0]?.fecha || '';

    elements.bookingDate.min = state.minDate;
    elements.bookingDate.value = state.selectedDate;

    if (!state.availableDays.length) {
        renderAvailabilityInfo('No encontramos dias disponibles con esa combinacion.', true);
        return;
    }

    renderAvailabilityInfo('', false);
    await loadAvailabilitySlots();
}

async function loadAvailabilitySlots() {
    const service = getSelectedService();

    if (!service || !state.selectedDate) {
        state.availableSlots = [];
        state.selectedTime = '';
        renderTimeOptions();
        renderAvailabilityInfo('', false);
        return;
    }

    const selectedDay = state.availableDays.find((day) => day.fecha === state.selectedDate);
    if (!selectedDay) {
        state.availableSlots = [];
        state.selectedTime = '';
        renderTimeOptions();
        renderAvailabilityInfo('', false);
        return;
    }

    renderAvailabilityInfo('', false);

    const params = new URLSearchParams({
        serviceId: service._id,
        fecha: state.selectedDate
    });

    if (elements.barberSelect.value) {
        params.set('barberId', elements.barberSelect.value);
    }

    const payload = await fetchJson(`/api/public/availability/slots?${params.toString()}`);
    state.availableSlots = payload.slots || [];

    const currentSlot = state.availableSlots.find((slot) => slot.hora === state.selectedTime);
    if (!currentSlot) {
        state.selectedTime = '';
        state.selectedSlotBarberName = '';
    } else {
        state.selectedSlotBarberName = currentSlot.barberNombre;
    }

    renderTimeOptions();

    if (!state.availableSlots.length) {
        renderAvailabilityInfo('No hay horarios libres para ese dia.', true);
    } else {
        renderAvailabilityInfo('', false);
    }
}

async function submitBooking(event) {
    event.preventDefault();
    hideMessage();

    const service = getSelectedService();
    if (!service) {
        showMessage('Selecciona un servicio antes de reservar.', 'error');
        return;
    }

    if (state.clientMode === 'existing' && !state.selectedClient) {
        showMessage('Selecciona un cliente existente.', 'error');
        return;
    }

    if (state.clientMode === 'new') {
        if (!state.newClientDraft?.nombre) {
            showMessage('Carga el cliente nuevo antes de reservar.', 'error');
            return;
        }

        if (!state.newClientDraft?.telefono) {
            showMessage('Carga el cliente nuevo antes de reservar.', 'error');
            return;
        }
    }

    if (!state.selectedDate) {
        showMessage('Selecciona una fecha.', 'error');
        return;
    }

    if (!state.selectedTime) {
        showMessage('Selecciona un horario disponible.', 'error');
        return;
    }

    setLoadingState(true);

    try {
        const payload = await fetchJson('/api/public/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: state.selectedDate,
                hora: state.selectedTime,
                servicioId: service._id,
                peluqueroId: elements.barberSelect.value || '',
                clientId: state.clientMode === 'existing' ? state.selectedClient?._id || '' : '',
                nombre: state.clientMode === 'new' ? state.newClientDraft?.nombre || '' : '',
                telefono: state.clientMode === 'new' ? state.newClientDraft?.telefono || '' : '',
                instagram: state.clientMode === 'new' ? state.newClientDraft?.instagram || '' : ''
            })
        });

        const booking = payload.booking;
        showMessage(`Reserva confirmada para ${booking.fecha} a las ${booking.hora} con ${booking.peluquero}.`, 'success');
        clearSelectedClient();
        state.newClientDraft = null;
        renderNewClientSummary();
        await loadAvailabilityDays();
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        setLoadingState(false);
    }
}

function buildCarouselDots(slides) {
    elements.carouselDots.innerHTML = slides
        .map((_, index) => `<button type="button" class="carousel-dot ${index === 0 ? 'is-active' : ''}" data-index="${index}" aria-label="Ir a la imagen ${index + 1}"></button>`)
        .join('');
}

function renderCarousel(index) {
    const slides = Array.from(elements.carouselTrack.querySelectorAll('.carousel-slide'));
    const dots = Array.from(elements.carouselDots.querySelectorAll('.carousel-dot'));
    carouselIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === carouselIndex);
    });

    dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === carouselIndex);
    });
}

function restartCarouselTimer() {
    window.clearInterval(carouselTimer);
    carouselTimer = window.setInterval(() => {
        renderCarousel(carouselIndex + 1);
    }, 5000);
}

function attachEvents() {
    document.querySelectorAll('[data-client-mode]').forEach((button) => {
        button.addEventListener('click', () => {
            state.clientMode = button.dataset.clientMode === 'new' ? 'new' : 'existing';
            hideMessage();
            if (state.clientMode === 'existing') {
                renderSelectedClient();
            } else {
                clearSelectedClient();
                openNewClientModal();
            }
            renderClientMode();
        });
    });

    elements.existingClientSearch.addEventListener('input', () => {
        hideMessage();

        if (state.selectedClient && elements.existingClientSearch.value.trim() !== state.selectedClient.nombre) {
            state.selectedClient = null;
            renderSelectedClient();
        }

        scheduleExistingClientSearch();
    });

    elements.existingClientResults.addEventListener('click', (event) => {
        const button = event.target.closest('[data-client-id]');
        if (!button) {
            return;
        }

        const selectedId = button.dataset.clientId;
        state.selectedClient = state.existingClients.find((item) => item._id === selectedId) || null;
        renderExistingClientResults(elements.existingClientSearch.value);
        renderSelectedClient();
    });

    elements.openNewClientModalBtn.addEventListener('click', () => {
        openNewClientModal();
    });

    elements.closeNewClientModalBtn.addEventListener('click', () => {
        if (!state.newClientDraft) {
            state.clientMode = 'existing';
            renderClientMode();
        }
        closeNewClientModal();
    });

    elements.newClientModal.addEventListener('click', (event) => {
        if (event.target.id === 'newClientModal') {
            if (!state.newClientDraft) {
                state.clientMode = 'existing';
                renderClientMode();
            }
            closeNewClientModal();
        }
    });

    elements.newClientModalForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const nombre = elements.customerName.value.trim();
        const telefono = elements.customerPhone.value.trim();
        const instagram = elements.customerInstagram.value.trim();

        if (!nombre) {
            showMessage('Ingresa nombre y apellido del cliente nuevo.', 'error');
            return;
        }

        if (!telefono) {
            showMessage('Ingresa el telefono del cliente nuevo.', 'error');
            return;
        }

        state.newClientDraft = { nombre, telefono, instagram };
        state.clientMode = 'new';
        renderClientMode();
        closeNewClientModal();
        hideMessage();
    });

    elements.serviceSelect.addEventListener('change', async () => {
        try {
            hideMessage();
            await loadAvailabilityDays();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    elements.barberSelect.addEventListener('change', async () => {
        try {
            hideMessage();
            await loadAvailabilityDays();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    elements.bookingDate.addEventListener('change', async () => {
        try {
            hideMessage();
            state.selectedDate = elements.bookingDate.value;
            state.selectedTime = '';
            state.selectedSlotBarberName = '';
            await loadAvailabilitySlots();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    elements.timeSelect.addEventListener('change', () => {
        state.selectedTime = elements.timeSelect.value;
        const selectedSlot = state.availableSlots.find((slot) => slot.hora === state.selectedTime) || null;
        state.selectedSlotBarberName = selectedSlot?.barberNombre || '';
    });

    elements.refreshAvailability.addEventListener('click', async () => {
        try {
            hideMessage();
            await loadAvailabilityDays();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    elements.bookingForm.addEventListener('submit', submitBooking);

    elements.prevSlide.addEventListener('click', () => {
        renderCarousel(carouselIndex - 1);
        restartCarouselTimer();
    });

    elements.nextSlide.addEventListener('click', () => {
        renderCarousel(carouselIndex + 1);
        restartCarouselTimer();
    });

    elements.carouselDots.addEventListener('click', (event) => {
        const button = event.target.closest('[data-index]');
        if (!button) {
            return;
        }

        renderCarousel(Number(button.dataset.index));
        restartCarouselTimer();
    });
}

async function init() {
    const payload = await fetchJson('/api/public/config');

    state.business = payload.business;
    state.services = payload.services || [];
    state.barbers = payload.barbers || [];
    state.minDate = payload.minDate;

    renderBusinessInfo();
    renderServiceOptions();
    renderBarberOptions();
    renderClientMode();

    elements.bookingDate.min = state.minDate;

    const slides = Array.from(elements.carouselTrack.querySelectorAll('.carousel-slide'));
    buildCarouselDots(slides);
    renderCarousel(0);
    restartCarouselTimer();
    attachEvents();

    if (state.services.length) {
        await loadAvailabilityDays();
    } else {
        renderAvailabilityInfo('No hay servicios disponibles para reservar.', true);
    }
}

init().catch((error) => {
    showMessage(error.message, 'error');
});
