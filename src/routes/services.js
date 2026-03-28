const express = require('express');
const Service = require('../models/Service');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function parsePrice(value) {
    const precio = Number(value);
    if (Number.isNaN(precio) || precio < 0) {
        throw new Error('Importe invalido');
    }
    return Number(precio.toFixed(2));
}

function parseDuration(value) {
    const duracion = Number(value);
    if (!Number.isInteger(duracion) || duracion <= 0) {
        throw new Error('La duracion debe estar expresada en minutos');
    }
    return duracion;
}

router.get('/', authRequired, async (req, res) => {
    const servicios = await Service.find().sort({ nombre: 1 });
    return res.json(servicios);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
    try {
        const nombre = String(req.body?.nombre || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
        }

        const precio = parsePrice(req.body?.precio);
        const duracionMinutos = parseDuration(req.body?.duracionMinutos);
        const servicio = await Service.create({
            nombre,
            nombreNormalizado: normalizeName(nombre),
            precio,
            duracionMinutos
        });

        return res.status(201).json(servicio);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un servicio con ese nombre' });
        }
        return res.status(400).json({ error: error.message || 'No se pudo crear el servicio' });
    }
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const servicio = await Service.findById(req.params.id);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        const nombre = String(req.body?.nombre || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
        }

        const precio = parsePrice(req.body?.precio);
        const duracionMinutos = parseDuration(req.body?.duracionMinutos);
        servicio.nombre = nombre;
        servicio.nombreNormalizado = normalizeName(nombre);
        servicio.precio = precio;
        servicio.duracionMinutos = duracionMinutos;
        await servicio.save();

        return res.json(servicio);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un servicio con ese nombre' });
        }
        return res.status(400).json({ error: error.message || 'No se pudo actualizar el servicio' });
    }
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    return res.json({ ok: true });
});

module.exports = router;
