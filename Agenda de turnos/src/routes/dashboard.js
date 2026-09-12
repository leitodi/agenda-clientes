const express = require('express');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');
const Barber = require('../models/Barber');
const Client = require('../models/Client');
const { authRequired, notAgendaRequired, adminRequired } = require('../middleware/auth');
const { getLegacyAttendancesByDateRange, getLegacyBirthdayData } = require('../utils/legacyAttendanceStore');
const { findUserById } = require('../utils/userStore');

const router = express.Router();
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'America/Argentina/Buenos_Aires';

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '').trim();
}

function normalizeOptionalBirthday(value) {
    const text = String(value || '').trim();
    if (!text) {
        return '';
    }

    let day;
    let month;
    let year;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
        [day, month, year] = text.split('/').map(Number);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        [year, month, day] = text.split('-').map(Number);
    } else {
        return '';
    }

    const date = new Date(year, month - 1, day);
    if (
        Number.isNaN(date.getTime())
        || date.getFullYear() !== year
        || date.getMonth() !== month - 1
        || date.getDate() !== day
    ) {
        return '';
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function buildIdentityKeys(person) {
    const keys = [];
    const normalizedPhone = normalizePhone(person?.telefono || person?.telefonoNormalizado);
    const normalizedName = normalizeName(person?.nombre);

    if (normalizedPhone) {
        keys.push(`phone:${normalizedPhone}`);
    }

    if (normalizedName) {
        keys.push(`name:${normalizedName}`);
    }

    return keys;
}

function mergeBirthdayPeople(primary, secondary, type) {
    const merged = [];
    const seen = new Set();

    const append = (person, source) => {
        const nombre = String(person?.nombre || '').trim();
        const fechaCumpleanos = normalizeOptionalBirthday(person?.fechaCumpleanos);
        if (!nombre || !fechaCumpleanos) {
            return;
        }

        const identityKeys = buildIdentityKeys(person);
        if (identityKeys.some((key) => seen.has(key))) {
            return;
        }

        identityKeys.forEach((key) => seen.add(key));

        merged.push({
            _id: person?._id ? String(person._id) : '',
            nombre,
            telefono: String(person?.telefono || '').trim(),
            telefonoNormalizado: normalizePhone(person?.telefonoNormalizado || person?.telefono),
            fechaCumpleanos,
            origen: source,
            historialDisponible: type === 'Cliente' && source === 'actual'
        });
    };

    primary.forEach((person) => append(person, 'actual'));
    secondary.forEach((person) => append(person, 'legacy'));

    return merged.sort((a, b) => {
        const birthdayCompare = a.fechaCumpleanos.localeCompare(b.fechaCumpleanos);
        if (birthdayCompare !== 0) {
            return birthdayCompare;
        }

        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });
}

function getCurrentAppDateContext() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = Object.fromEntries(
        formatter
            .formatToParts(new Date())
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value])
    );

    const fecha = `${parts.year}-${parts.month}-${parts.day}`;
    const minutosActuales = (Number(parts.hour || 0) * 60) + Number(parts.minute || 0);

    return {
        fecha,
        minutosActuales
    };
}

function mapReservationAlert(reserva, audience) {
    return {
        id: reserva._id,
        type: 'new_web_reservation',
        audience,
        fecha: reserva.fecha,
        hora: reserva.horaInicio,
        cliente: reserva.cliente || '',
        peluquero: reserva.peluquero?.nombre || 'Primero disponible',
        servicio: reserva.servicioNombre || ''
    };
}

function mapReminderAlert(turno, audience) {
    return {
        id: turno._id,
        type: 'upcoming_turn',
        audience,
        fecha: turno.fecha,
        hora: turno.horaInicio,
        cliente: turno.cliente || '',
        peluquero: turno.peluquero?.nombre || 'Sin peluquero',
        servicio: turno.servicioNombre || ''
    };
}

async function takeAdminReservationAlerts() {
    const reservas = await Appointment.find({
        origenReserva: 'web',
        alertaAdminVistaEn: null
    })
        .populate('peluquero', 'nombre')
        .sort({ createdAt: 1 })
        .limit(20);

    if (!reservas.length) {
        return [];
    }

    const seenAt = new Date();
    await Appointment.updateMany(
        { _id: { $in: reservas.map((item) => item._id) } },
        { $set: { alertaAdminVistaEn: seenAt } }
    );

    return reservas.map((reserva) => mapReservationAlert(reserva, 'admin'));
}

async function takeBarberReservationAlerts(barberId) {
    const reservas = await Appointment.find({
        origenReserva: 'web',
        peluquero: barberId,
        alertaPeluqueroVistaEn: null
    })
        .populate('peluquero', 'nombre')
        .sort({ createdAt: 1 })
        .limit(20);

    if (!reservas.length) {
        return [];
    }

    const seenAt = new Date();
    await Appointment.updateMany(
        { _id: { $in: reservas.map((item) => item._id) } },
        { $set: { alertaPeluqueroVistaEn: seenAt } }
    );

    return reservas.map((reserva) => mapReservationAlert(reserva, 'barber'));
}

async function takeAdminReminderAlerts() {
    const { fecha, minutosActuales } = getCurrentAppDateContext();
    const turnos = await Appointment.find({
        fecha,
        estado: 'pendiente',
        inicioMinutos: { $gt: minutosActuales, $lte: minutosActuales + 60 },
        alertaRecordatorioAdminVistaEn: null
    })
        .populate('peluquero', 'nombre')
        .sort({ inicioMinutos: 1 })
        .limit(20);

    if (!turnos.length) {
        return [];
    }

    const seenAt = new Date();
    await Appointment.updateMany(
        { _id: { $in: turnos.map((item) => item._id) } },
        { $set: { alertaRecordatorioAdminVistaEn: seenAt } }
    );

    return turnos.map((turno) => mapReminderAlert(turno, 'admin'));
}

async function takeBarberReminderAlerts(barberId) {
    const { fecha, minutosActuales } = getCurrentAppDateContext();
    const turnos = await Appointment.find({
        fecha,
        estado: 'pendiente',
        peluquero: barberId,
        inicioMinutos: { $gt: minutosActuales, $lte: minutosActuales + 60 },
        alertaRecordatorioPeluqueroVistaEn: null
    })
        .populate('peluquero', 'nombre')
        .sort({ inicioMinutos: 1 })
        .limit(20);

    if (!turnos.length) {
        return [];
    }

    const seenAt = new Date();
    await Appointment.updateMany(
        { _id: { $in: turnos.map((item) => item._id) } },
        { $set: { alertaRecordatorioPeluqueroVistaEn: seenAt } }
    );

    return turnos.map((turno) => mapReminderAlert(turno, 'barber'));
}

router.get('/', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const { fecha } = req.query;
        const attendanceFilter = fecha ? { fecha } : {};

        const [turnosResult, atencionesResult, peluquerosResult] = await Promise.allSettled([
            Appointment.countDocuments(attendanceFilter),
            Attendance.countDocuments(attendanceFilter),
            Barber.countDocuments({ activo: true })
        ]);

        let totalAtenciones = atencionesResult.status === 'fulfilled' ? atencionesResult.value : 0;
        if (!totalAtenciones && fecha) {
            try {
                const legacyRows = await getLegacyAttendancesByDateRange({ desde: fecha, hasta: fecha });
                totalAtenciones = legacyRows.length;
            } catch (legacyError) {
                console.warn('No se pudo consultar atenciones legacy para dashboard:', legacyError.message);
            }
        }

        return res.json({
            fecha: fecha || null,
            totalTurnos: turnosResult.status === 'fulfilled' ? turnosResult.value : 0,
            totalAtenciones,
            peluquerosActivos: peluquerosResult.status === 'fulfilled' ? peluquerosResult.value : 0
        });
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        return res.json({
            fecha: req.query?.fecha || null,
            totalTurnos: 0,
            totalAtenciones: 0,
            peluquerosActivos: 0
        });
    }
});

router.get('/cumpleanos', authRequired, async (req, res) => {
    try {
        const [clientesActuales, peluquerosActuales, legacyData] = await Promise.all([
            Client.find({
                fechaCumpleanos: { $exists: true, $ne: '' }
            }).select('nombre telefono telefonoNormalizado fechaCumpleanos').lean(),
            Barber.find({
                fechaCumpleanos: { $exists: true, $ne: '' }
            }).select('nombre telefono fechaCumpleanos').lean(),
            getLegacyBirthdayData()
        ]);

        return res.json({
            clientes: mergeBirthdayPeople(clientesActuales, legacyData.clientes || [], 'Cliente'),
            peluqueros: mergeBirthdayPeople(peluquerosActuales, legacyData.peluqueros || [], 'Personal')
        });
    } catch (error) {
        console.error('Error cargando cumpleanos:', error);
        return res.json({
            clientes: [],
            peluqueros: []
        });
    }
});

router.get('/alertas-reservas-web', authRequired, adminRequired, async (req, res) => {
    try {
        const reservas = await Appointment.find({
            origenReserva: 'web',
            alertaAdminVistaEn: null
        })
            .populate('peluquero', 'nombre')
            .sort({ createdAt: 1 })
            .limit(20);

        if (!reservas.length) {
            return res.json({ alerts: [] });
        }

        const seenAt = new Date();
        await Appointment.updateMany(
            { _id: { $in: reservas.map((item) => item._id) } },
            { $set: { alertaAdminVistaEn: seenAt } }
        );

        return res.json({
            alerts: reservas.map((reserva) => ({
                id: reserva._id,
                fecha: reserva.fecha,
                hora: reserva.horaInicio,
                cliente: reserva.cliente || '',
                peluquero: reserva.peluquero?.nombre || 'Primero disponible',
                servicio: reserva.servicioNombre || ''
            }))
        });
    } catch (error) {
        console.error('Error cargando alertas de reservas web:', error);
        return res.json({ alerts: [] });
    }
});

router.get('/alertas-cuenta', authRequired, async (req, res) => {
    try {
        const user = await findUserById(req.user.id, req.user.source || 'legacy');
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        let alerts = [];

        if (req.user.role === 'admin') {
            const [reservationAlerts, reminderAlerts] = await Promise.all([
                takeAdminReservationAlerts(),
                takeAdminReminderAlerts()
            ]);
            alerts = reservationAlerts.concat(reminderAlerts);
        } else if (user.barberId) {
            const [reservationAlerts, reminderAlerts] = await Promise.all([
                takeBarberReservationAlerts(user.barberId),
                takeBarberReminderAlerts(user.barberId)
            ]);
            alerts = reservationAlerts.concat(reminderAlerts);
        }

        return res.json({ alerts });
    } catch (error) {
        console.error('Error cargando alertas de cuenta:', error);
        return res.json({ alerts: [] });
    }
});

module.exports = router;
