const express = require('express');
const Barber = require('../models/Barber');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

function normalizarAgenda(agenda) {
    if (!Array.isArray(agenda)) {
        throw new Error('Agenda invalida');
    }

    const valid = agenda.map((slot) => ({
        dayOfWeek: Number(slot.dayOfWeek),
        start: String(slot.start),
        end: String(slot.end)
    })).filter((slot) => (
        Number.isInteger(slot.dayOfWeek) && slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6
    ));

    if (valid.length === 0) {
        throw new Error('Debes definir al menos un horario por dia');
    }

    return valid.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

function normalizeOptionalDate(value) {
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
        throw new Error('Fecha de cumpleanos invalida. Usa DD/MM/YYYY');
    }

    const date = new Date(year, month - 1, day);
    if (
        Number.isNaN(date.getTime())
        || date.getFullYear() !== year
        || date.getMonth() !== month - 1
        || date.getDate() !== day
    ) {
        throw new Error('Fecha de cumpleanos invalida. Usa DD/MM/YYYY');
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

router.get('/', authRequired, async (req, res) => {
    const barbers = await Barber.find().sort({ nombre: 1 });
    return res.json(barbers);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
    const { nombre, telefono, fechaCumpleanos, porcentajeComision, agenda, activo } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'Nombre requerido' });
    }

    let agendaNormalizada;
    let fechaCumpleNormalizada = '';

    try {
        agendaNormalizada = normalizarAgenda(agenda || []);
        fechaCumpleNormalizada = normalizeOptionalDate(fechaCumpleanos);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const barber = await Barber.create({
        nombre: String(nombre).trim(),
        telefono: String(telefono || '').trim(),
        fechaCumpleanos: fechaCumpleNormalizada,
        porcentajeComision: Number(porcentajeComision),
        agenda: agendaNormalizada,
        activo: Boolean(activo ?? true)
    });

    return res.status(201).json(barber);
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
    const { nombre, telefono, fechaCumpleanos, porcentajeComision, agenda, activo } = req.body;

    let agendaNormalizada;
    let fechaCumpleNormalizada = '';

    try {
        agendaNormalizada = normalizarAgenda(agenda || []);
        fechaCumpleNormalizada = normalizeOptionalDate(fechaCumpleanos);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const updated = await Barber.findByIdAndUpdate(
        req.params.id,
        {
            nombre: String(nombre || '').trim(),
            telefono: String(telefono || '').trim(),
            fechaCumpleanos: fechaCumpleNormalizada,
            porcentajeComision: Number(porcentajeComision),
            agenda: agendaNormalizada,
            activo: Boolean(activo)
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        return res.status(404).json({ error: 'Peluquero no encontrado' });
    }

    return res.json(updated);
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
    const deleted = await Barber.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ error: 'Peluquero no encontrado' });
    }

    return res.json({ ok: true });
});

module.exports = router;
