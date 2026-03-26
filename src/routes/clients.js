const express = require('express');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
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

    let fechaCumpleNormalizada = '';
    try {
        fechaCumpleNormalizada = normalizeOptionalBirthday(fechaCumpleanos);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const nombreNormalizado = normalizeName(fullName);
    const existing = telefonoNormalizado ? await Client.findOne({ telefonoNormalizado }) : null;
    if (existing) {
        existing.nombre = fullName;
        existing.telefono = telefonoRaw;
        existing.telefonoNormalizado = telefonoNormalizado;
        existing.instagram = String(instagram || '').trim();
        if (fechaCumpleanos !== undefined) {
            existing.fechaCumpleanos = fechaCumpleNormalizada;
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
        fechaCumpleanos: fechaCumpleNormalizada,
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

router.put('/:id', authRequired, async (req, res) => {
    const { nombre, apellido, telefono, instagram, fechaCumpleanos, foto1, foto2 } = req.body;

    const cliente = await Client.findById(req.params.id);
    if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const fullName = `${String(nombre || '').trim()} ${String(apellido || '').trim()}`.trim();
    const telefonoRaw = String(telefono || '').trim();
    const telefonoNormalizado = normalizePhone(telefonoRaw);

    if (!fullName) {
        return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }

    let fechaCumpleNormalizada = '';
    try {
        fechaCumpleNormalizada = normalizeOptionalBirthday(fechaCumpleanos);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    if (telefonoNormalizado) {
        const existing = await Client.findOne({
            telefonoNormalizado,
            _id: { $ne: cliente._id }
        });

        if (existing) {
            return res.status(409).json({ error: 'Ya existe otro cliente con ese telefono' });
        }
    }

    cliente.nombre = fullName;
    cliente.nombreNormalizado = normalizeName(fullName);
    cliente.telefono = telefonoRaw;
    cliente.telefonoNormalizado = telefonoNormalizado;
    cliente.instagram = String(instagram || '').trim();
    cliente.fechaCumpleanos = fechaCumpleNormalizada;

    if (foto1 !== undefined) {
        cliente.foto1 = String(foto1 || '');
    }

    if (foto2 !== undefined) {
        cliente.foto2 = String(foto2 || '');
    }

    await cliente.save();
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

router.delete('/:id', authRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Cliente invalido' });
    }

    try {
        const cliente = await Client.findByIdAndDelete(req.params.id);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        try {
            await Appointment.updateMany(
                { clienteId: cliente._id },
                { $set: { clienteId: null } }
            );
        } catch (cleanupError) {
            console.error('No se pudieron limpiar los turnos del cliente eliminado:', cleanupError);
        }

        return res.json({ ok: true });
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        return res.status(500).json({ error: 'No se pudo eliminar el cliente' });
    }
});

module.exports = router;
