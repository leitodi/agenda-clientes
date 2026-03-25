const express = require('express');
const Client = require('../models/Client');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '').trim();
}

router.get('/', authRequired, async (req, res) => {
    const clientes = await Client.find().sort({ nombre: 1 });
    return res.json(clientes);
});

router.post('/', authRequired, async (req, res) => {
    const { nombre, apellido, telefono, instagram, fechaCumpleanos, foto1, foto2 } = req.body;

    const fullName = `${String(nombre || '').trim()} ${String(apellido || '').trim()}`.trim();
    const telefonoRaw = String(telefono || '').trim();
    const telefonoNormalizado = normalizePhone(telefonoRaw);

    if (!fullName) {
        return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    const nombreNormalizado = normalizeName(fullName);
    const existing = telefonoNormalizado ? await Client.findOne({ telefonoNormalizado }) : null;
    if (existing) {
        existing.nombre = fullName;
        existing.telefono = telefonoRaw;
        existing.telefonoNormalizado = telefonoNormalizado;
        existing.instagram = String(instagram || '').trim();
        if (fechaCumpleanos !== undefined) {
            existing.fechaCumpleanos = String(fechaCumpleanos || '').trim();
        }
        if (foto1) {
            existing.foto1 = String(foto1);
        }
        if (foto2) {
            existing.foto2 = String(foto2);
        }
        await existing.save();
        return res.json(existing);
    }

    const cliente = await Client.create({
        nombre: fullName,
        nombreNormalizado,
        telefono: telefonoRaw,
        telefonoNormalizado,
        instagram: String(instagram || '').trim(),
        fechaCumpleanos: String(fechaCumpleanos || '').trim(),
        foto1: String(foto1 || ''),
        foto2: String(foto2 || '')
    });

    return res.status(201).json(cliente);
});

router.get('/:id', authRequired, async (req, res) => {
    const cliente = await Client.findById(req.params.id);

    if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json(cliente);
});

router.put('/:id/fotos', authRequired, async (req, res) => {
    const { foto1, foto2 } = req.body;
    const cliente = await Client.findById(req.params.id);

    if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const hasFoto1 = foto1 !== undefined;
    const hasFoto2 = foto2 !== undefined;

    if (!hasFoto1 && !hasFoto2) {
        return res.status(400).json({ error: 'Debes enviar al menos una foto para actualizar' });
    }

    if (hasFoto1) {
        cliente.foto1 = String(foto1 || '');
    }

    if (hasFoto2) {
        cliente.foto2 = String(foto2 || '');
    }

    await cliente.save();
    return res.json(cliente);
});

module.exports = router;
