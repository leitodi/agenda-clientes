const express = require('express');
const { authRequired, adminRequired } = require('../middleware/auth');
const {
    DEFAULT_SERVICE_WORK_TYPE,
    isValidServiceWorkType
} = require('../utils/serviceWorkTypes');
const {
    listServices,
    createService,
    updateService,
    deleteService
} = require('../utils/serviceStore');

const router = express.Router();

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

function parseWorkType(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
        return DEFAULT_SERVICE_WORK_TYPE;
    }

    if (!isValidServiceWorkType(normalized)) {
        throw new Error('Tipo de trabajo invalido');
    }

    return normalized;
}

router.get('/', authRequired, async (req, res) => {
    const servicios = await listServices();
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
        const tipoTrabajo = parseWorkType(req.body?.tipoTrabajo);
        const servicio = await createService({ nombre, precio, duracionMinutos, tipoTrabajo });

        return res.status(201).json(servicio);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un servicio con ese nombre para ese tipo de trabajo' });
        }
        return res.status(400).json({ error: error.message || 'No se pudo crear el servicio' });
    }
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const nombre = String(req.body?.nombre || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del servicio es obligatorio' });
        }

        const precio = parsePrice(req.body?.precio);
        const duracionMinutos = parseDuration(req.body?.duracionMinutos);
        const tipoTrabajo = parseWorkType(req.body?.tipoTrabajo);
        const servicio = await updateService(req.params.id, { nombre, precio, duracionMinutos, tipoTrabajo });
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        return res.json(servicio);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un servicio con ese nombre para ese tipo de trabajo' });
        }
        return res.status(400).json({ error: error.message || 'No se pudo actualizar el servicio' });
    }
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
    const deleted = await deleteService(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    return res.json({ ok: true });
});

module.exports = router;
