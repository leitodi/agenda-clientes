const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const Client = require('../models/Client');
const User = require('../models/User');
const { parseTimeToMinutes, minutesToTime, getDayOfWeek } = require('../utils/time');
const { listServices, findServiceById } = require('../utils/serviceStore');

const router = express.Router();

const OPENING_MINUTES = 10 * 60;
const CLOSING_MINUTES = 22 * 60;
const SLOT_STEP_MINUTES = 30;
const DEFAULT_LOOKAHEAD_DAYS = 21;
const MAX_LOOKAHEAD_DAYS = 45;
const PUBLIC_BOOKING_USERNAME = (process.env.PUBLIC_BOOKING_USER || 'reservasweb').toLowerCase();
const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function isValidDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(dateString, amount) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toISOString().slice(0, 10);
}

function formatDateLabel(dateString) {
    const dayOfWeek = getDayOfWeek(dateString);
    const [, month, day] = dateString.split('-');
    return `${DAY_LABELS[dayOfWeek]} ${day}/${month}`;
}

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '').trim();
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function roundUpToStep(minutes) {
    return Math.ceil(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
}

function overlaps(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

function getBusinessConfig() {
    return {
        name: process.env.PUBLIC_BUSINESS_NAME || 'Salon Milano',
        subtitle: process.env.PUBLIC_BUSINESS_SUBTITLE || 'Reserva tu turno online en menos de un minuto',
        phone: process.env.PUBLIC_BUSINESS_PHONE || '',
        instagram: process.env.PUBLIC_BUSINESS_INSTAGRAM || '@salonmilano',
        address: process.env.PUBLIC_BUSINESS_ADDRESS || 'Atencion de lunes a sabado',
        openingHours: process.env.PUBLIC_BUSINESS_HOURS || 'Lunes a sabado de 10:00 a 22:00'
    };
}

async function getPublicBookingUser() {
    return User.findOne({ username: PUBLIC_BOOKING_USERNAME }).select('_id username');
}

async function resolveService(serviceId) {
    const id = String(serviceId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Servicio invalido');
    }

    const service = await findServiceById(id);
    if (!service) {
        throw new Error('Servicio no encontrado');
    }

    const durationMinutes = Number(service.duracionMinutos || 0);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        throw new Error('El servicio seleccionado no tiene una duracion valida');
    }

    return {
        id: service._id.toString(),
        source: service.source || 'primary',
        nombre: service.nombre,
        precio: Number(service.precio || 0),
        duracionMinutos: durationMinutes
    };
}

async function listCandidateBarbers(barberId) {
    const id = String(barberId || '').trim();

    if (id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Peluquero invalido');
        }

        const barber = await Barber.findOne({ _id: id, activo: true }).sort({ nombre: 1 });
        return barber ? [barber] : [];
    }

    return Barber.find({ activo: true }).sort({ nombre: 1 });
}

function getBarberWindowsForDate(barber, fecha) {
    const dayOfWeek = getDayOfWeek(fecha);
    if (dayOfWeek === 0) {
        return [];
    }

    return (barber.agenda || [])
        .filter((slot) => Number(slot.dayOfWeek) === dayOfWeek)
        .map((slot) => ({
            start: Math.max(OPENING_MINUTES, parseTimeToMinutes(slot.start)),
            end: Math.min(CLOSING_MINUTES, parseTimeToMinutes(slot.end))
        }))
        .filter((slot) => slot.end > slot.start)
        .sort((left, right) => left.start - right.start);
}

async function getAppointmentsByBarberForDate(fecha, barberIds) {
    if (!barberIds.length) {
        return new Map();
    }

    const appointments = await Appointment.find({
        fecha,
        peluquero: { $in: barberIds }
    }).select('peluquero inicioMinutos finMinutos');

    const appointmentsByBarber = new Map();

    appointments.forEach((appointment) => {
        const key = appointment.peluquero?.toString();
        if (!key) {
            return;
        }

        const list = appointmentsByBarber.get(key) || [];
        list.push({
            inicioMinutos: Number(appointment.inicioMinutos),
            finMinutos: Number(appointment.finMinutos)
        });
        appointmentsByBarber.set(key, list);
    });

    return appointmentsByBarber;
}

function getAvailableSlotsForBarber({ barber, fecha, duracionMinutos, appointments }) {
    const windows = getBarberWindowsForDate(barber, fecha);
    if (!windows.length) {
        return [];
    }

    const slots = [];

    windows.forEach((window) => {
        for (
            let start = roundUpToStep(window.start);
            start + duracionMinutos <= window.end;
            start += SLOT_STEP_MINUTES
        ) {
            const end = start + duracionMinutos;
            const hasConflict = appointments.some((appointment) => (
                overlaps(start, end, appointment.inicioMinutos, appointment.finMinutos)
            ));

            if (!hasConflict) {
                slots.push({
                    hora: minutesToTime(start),
                    inicioMinutos: start,
                    finMinutos: end,
                    barberId: barber._id.toString(),
                    barberNombre: barber.nombre
                });
            }
        }
    });

    return slots;
}

async function computeAvailableSlots({ fecha, duracionMinutos, barberId }) {
    if (!isValidDateString(fecha)) {
        throw new Error('Fecha invalida');
    }

    if (getDayOfWeek(fecha) === 0) {
        return [];
    }

    const barbers = await listCandidateBarbers(barberId);
    if (!barbers.length) {
        return [];
    }

    const barberIds = barbers.map((barber) => barber._id);
    const appointmentsByBarber = await getAppointmentsByBarberForDate(fecha, barberIds);

    if (barberId) {
        const barber = barbers[0];
        return getAvailableSlotsForBarber({
            barber,
            fecha,
            duracionMinutos,
            appointments: appointmentsByBarber.get(barber._id.toString()) || []
        });
    }

    const uniqueSlots = new Map();

    barbers.forEach((barber) => {
        const slots = getAvailableSlotsForBarber({
            barber,
            fecha,
            duracionMinutos,
            appointments: appointmentsByBarber.get(barber._id.toString()) || []
        });

        slots.forEach((slot) => {
            if (!uniqueSlots.has(slot.hora)) {
                uniqueSlots.set(slot.hora, slot);
            }
        });
    });

    return Array.from(uniqueSlots.values()).sort((left, right) => left.inicioMinutos - right.inicioMinutos);
}

async function resolvePublicClient({ clientId, nombre, telefono, instagram }) {
    const clientIdValue = String(clientId || '').trim();
    if (clientIdValue) {
        if (!mongoose.Types.ObjectId.isValid(clientIdValue)) {
            throw new Error('Cliente invalido');
        }

        const existingClient = await Client.findById(clientIdValue).select('_id nombre');
        if (!existingClient) {
            throw new Error('Cliente no encontrado');
        }

        return {
            clientId: existingClient._id,
            clientName: existingClient.nombre
        };
    }

    const normalizedName = normalizeName(nombre);
    const normalizedPhone = normalizePhone(telefono);

    if (!normalizedName) {
        throw new Error('Debes indicar tu nombre');
    }

    if (!normalizedPhone) {
        throw new Error('Debes indicar un telefono de contacto');
    }

    let client = await Client.findOne({ telefonoNormalizado: normalizedPhone });

    if (!client) {
        client = await Client.findOne({ nombreNormalizado: normalizedName });
    }

    if (!client) {
        client = await Client.create({
            nombre,
            nombreNormalizado: normalizedName,
            telefono,
            telefonoNormalizado: normalizedPhone,
            instagram: String(instagram || '').trim()
        });
    } else {
        client.nombre = nombre;
        client.nombreNormalizado = normalizedName;
        client.telefono = telefono;
        client.telefonoNormalizado = normalizedPhone;
        if (instagram) {
            client.instagram = String(instagram).trim();
        }
        await client.save();
    }

    return {
        clientId: client._id,
        clientName: client.nombre
    };
}

router.get('/clients', async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        if (query.length < 2) {
            return res.json({ clients: [] });
        }

        const limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 60, 120));
        const filter = { nombre: new RegExp(escapeRegExp(query), 'i') };

        const clients = await Client.find(filter)
            .select('nombre')
            .limit(limit)
            .lean();

        const response = clients
            .map((client) => ({
                _id: client._id,
                nombre: client.nombre
            }))
            .sort((left, right) => String(left.nombre || '').localeCompare(String(right.nombre || ''), 'es', { sensitivity: 'base' }));

        return res.json({
            clients: response
        });
    } catch (error) {
        console.error('Error cargando clientes publicos:', error);
        return res.json({ clients: [] });
    }
});

router.get('/config', async (req, res) => {
    const [services, barbers] = await Promise.all([
        listServices(),
        Barber.find({ activo: true }).sort({ nombre: 1 }).select('nombre agenda')
    ]);

    return res.json({
        business: getBusinessConfig(),
        minDate: getTodayDateString(),
        services: services.map((service) => ({
            _id: service._id,
            nombre: service.nombre,
            precio: Number(service.precio || 0),
            duracionMinutos: Number(service.duracionMinutos || 30),
            tipoTrabajo: service.tipoTrabajo
        })),
        barbers: barbers.map((barber) => ({
            _id: barber._id,
            nombre: barber.nombre
        }))
    });
});

router.get('/availability/days', async (req, res) => {
    try {
        const service = await resolveService(req.query.serviceId);
        const today = getTodayDateString();
        const from = isValidDateString(req.query.from) && req.query.from >= today
            ? req.query.from
            : today;
        const requestedDays = Number.parseInt(req.query.days, 10);
        const lookaheadDays = Number.isInteger(requestedDays)
            ? Math.max(1, Math.min(requestedDays, MAX_LOOKAHEAD_DAYS))
            : DEFAULT_LOOKAHEAD_DAYS;

        const days = [];

        for (let offset = 0; offset < lookaheadDays; offset += 1) {
            const fecha = addDays(from, offset);
            const slots = await computeAvailableSlots({
                fecha,
                duracionMinutos: service.duracionMinutos,
                barberId: req.query.barberId
            });

            if (slots.length) {
                days.push({
                    fecha,
                    etiqueta: formatDateLabel(fecha),
                    cantidadHorarios: slots.length,
                    primerHorario: slots[0].hora
                });
            }
        }

        return res.json({
            from,
            days
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo obtener la disponibilidad' });
    }
});

router.get('/availability/slots', async (req, res) => {
    try {
        const { fecha, barberId } = req.query;
        if (!isValidDateString(fecha)) {
            return res.status(400).json({ error: 'Fecha invalida' });
        }

        const service = await resolveService(req.query.serviceId);
        const slots = await computeAvailableSlots({
            fecha,
            duracionMinutos: service.duracionMinutos,
            barberId
        });

        return res.json({
            fecha,
            slots: slots.map((slot) => ({
                hora: slot.hora,
                barberId: slot.barberId,
                barberNombre: slot.barberNombre
            }))
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudieron obtener los horarios' });
    }
});

router.post('/bookings', async (req, res) => {
    try {
        const {
            fecha,
            hora,
            servicioId,
            peluqueroId,
            clientId,
            nombre,
            telefono,
            instagram
        } = req.body || {};

        if (!isValidDateString(fecha)) {
            return res.status(400).json({ error: 'Fecha invalida' });
        }

        if (fecha < getTodayDateString()) {
            return res.status(400).json({ error: 'Solo puedes reservar turnos desde hoy en adelante' });
        }

        if (!/^\d{2}:\d{2}$/.test(String(hora || ''))) {
            return res.status(400).json({ error: 'Hora invalida' });
        }

        const [service, publicBookingUser] = await Promise.all([
            resolveService(servicioId),
            getPublicBookingUser()
        ]);

        if (!publicBookingUser) {
            return res.status(500).json({ error: 'No se encontro el usuario tecnico de reservas web' });
        }

        const availableSlots = await computeAvailableSlots({
            fecha,
            duracionMinutos: service.duracionMinutos,
            barberId: peluqueroId
        });

        const matchingSlot = availableSlots.find((slot) => slot.hora === hora);
        if (!matchingSlot) {
            return res.status(409).json({ error: 'Ese horario ya no esta disponible' });
        }

        const client = await resolvePublicClient({
            clientId: String(clientId || '').trim(),
            nombre: String(nombre || '').trim(),
            telefono: String(telefono || '').trim(),
            instagram: String(instagram || '').trim()
        });

        const startMinutes = parseTimeToMinutes(hora);
        const endMinutes = startMinutes + service.duracionMinutos;

        const appointment = await Appointment.create({
            fecha,
            horaInicio: hora,
            horaFin: minutesToTime(endMinutes),
            inicioMinutos: startMinutes,
            finMinutos: endMinutes,
            servicio: service.id,
            servicioId: service.source === 'primary' ? service.id : null,
            servicioNombre: service.nombre,
            duracionMinutos: service.duracionMinutos,
            cliente: client.clientName,
            clienteId: client.clientId,
            origenReserva: 'web',
            alertaAdminVistaEn: null,
            peluquero: matchingSlot.barberId,
            creadoPor: publicBookingUser._id
        });

        return res.status(201).json({
            ok: true,
            booking: {
                id: appointment._id,
                fecha: appointment.fecha,
                hora: appointment.horaInicio,
                servicio: service.nombre,
                peluquero: matchingSlot.barberNombre,
                cliente: client.clientName
            }
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo registrar la reserva' });
    }
});

module.exports = router;
