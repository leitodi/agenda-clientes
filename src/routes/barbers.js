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

router.get('/', authRequired, async (req, res) => {
    const barbers = await Barber.find().sort({ nombre: 1 });
    return res.json(barbers);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
    const { nombre, telefono, porcentajeComision, agenda, activo } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'Nombre requerido' });
    }

    let agendaNormalizada;

    try {
        agendaNormalizada = normalizarAgenda(agenda || []);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const barber = await Barber.create({
        nombre: String(nombre).trim(),
        telefono: String(telefono || '').trim(),
        porcentajeComision: Number(porcentajeComision),
        agenda: agendaNormalizada,
        activo: Boolean(activo ?? true)
    });

    return res.status(201).json(barber);
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
    const { nombre, telefono, porcentajeComision, agenda, activo } = req.body;

    let agendaNormalizada;

    try {
        agendaNormalizada = normalizarAgenda(agenda || []);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const updated = await Barber.findByIdAndUpdate(
        req.params.id,
        {
            nombre: String(nombre || '').trim(),
            telefono: String(telefono || '').trim(),
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
