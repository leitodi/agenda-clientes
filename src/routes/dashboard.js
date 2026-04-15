const express = require('express');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');
const Barber = require('../models/Barber');
const Client = require('../models/Client');
const { authRequired, notAgendaRequired } = require('../middleware/auth');
const { getLegacyAttendancesByDateRange, getLegacyBirthdayData } = require('../utils/legacyAttendanceStore');

const router = express.Router();

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

module.exports = router;
