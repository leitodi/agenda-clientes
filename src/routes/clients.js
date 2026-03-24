const express = require('express');
const Client = require('../models/Client');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

router.get('/', authRequired, async (req, res) => {
    const clientes = await Client.find().sort({ nombre: 1 });
    return res.json(clientes);
});

router.post('/', authRequired, async (req, res) => {
    const { nombre, apellido, telefono, instagram, foto1, foto2 } = req.body;

    const fullName = `${String(nombre || '').trim()} ${String(apellido || '').trim()}`.trim();

    if (!fullName) {
        return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    const nombreNormalizado = normalizeName(fullName);

    const existing = await Client.findOne({ nombreNormalizado });
    if (existing) {
        existing.nombre = fullName;
        existing.telefono = String(telefono || '').trim();
        existing.instagram = String(instagram || '').trim();
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
        telefono: String(telefono || '').trim(),
        instagram: String(instagram || '').trim(),
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

module.exports = router;
