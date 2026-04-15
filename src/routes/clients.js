const express = require('express');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');
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

function scoreClientCompleteness(cliente) {
    let score = 0;

    if (String(cliente?.telefono || '').trim()) {
        score += 3;
    }

    if (String(cliente?.instagram || '').trim()) {
        score += 2;
    }

    if (String(cliente?.fechaCumpleanos || '').trim()) {
        score += 2;
    }

    if (String(cliente?.foto1 || '').trim()) {
        score += 1;
    }

    if (String(cliente?.foto2 || '').trim()) {
        score += 1;
    }

    if (String(cliente?.ultimaAtencion || '').trim()) {
        score += 1;
    }

    return score;
}

function pickPreferredClient(current, candidate) {
    if (!current) {
        return candidate;
    }

    const currentScore = scoreClientCompleteness(current);
    const candidateScore = scoreClientCompleteness(candidate);

    if (candidateScore !== currentScore) {
        return candidateScore > currentScore ? candidate : current;
    }

    const currentCreatedAt = new Date(current.createdAt || 0).getTime();
    const candidateCreatedAt = new Date(candidate.createdAt || 0).getTime();
    return candidateCreatedAt >= currentCreatedAt ? candidate : current;
}

function dedupeClientsByName(clientes) {
    const byName = new Map();

    for (const cliente of clientes || []) {
        const key = String(cliente?.nombreNormalizado || '').trim();
        if (!key) {
            continue;
        }

        const preferred = pickPreferredClient(byName.get(key), cliente);
        byName.set(key, preferred);
    }

    return Array.from(byName.values()).sort((a, b) => {
        const aCreatedAt = new Date(a.createdAt || 0).getTime();
        const bCreatedAt = new Date(b.createdAt || 0).getTime();
        return bCreatedAt - aCreatedAt;
    });
}

async function getLatestAttendanceByClient(normalizedNames) {
    const validNames = Array.from(new Set(
        (normalizedNames || [])
            .map((item) => String(item || '').trim().toLowerCase())
            .filter(Boolean)
    ));

    if (!validNames.length) {
        return new Map();
    }

    const rows = await Attendance.aggregate([
        {
            $match: {
                cliente: { $exists: true, $ne: '' }
            }
        },
        {
            $addFields: {
                clienteNormalizado: {
                    $toLower: {
                        $trim: { input: '$cliente' }
                    }
                }
            }
        },
        {
            $match: {
                clienteNormalizado: { $in: validNames }
            }
        },
        {
            $sort: { fecha: -1, createdAt: -1 }
        },
        {
            $group: {
                _id: '$clienteNormalizado',
                fecha: { $first: '$fecha' },
                peluqueroId: { $first: '$peluquero' }
            }
        }
    ]);

    const peluqueroIds = rows
        .map((row) => String(row.peluqueroId || '').trim())
        .filter(Boolean);

    const peluqueros = peluqueroIds.length
        ? await mongoose.model('Barber').find({ _id: { $in: peluqueroIds } }).select('nombre')
        : [];

    const peluquerosById = new Map(peluqueros.map((item) => [String(item._id), item.nombre]));

    return new Map(rows.map((row) => [
        row._id,
        {
            ultimaAtencion: String(row.fecha || ''),
            ultimaAtencionPeluquero: peluquerosById.get(String(row.peluqueroId || '')) || ''
        }
    ]));
}

async function getAttendanceHistoryByClient(normalizedName) {
    const validName = normalizeName(normalizedName);
    if (!validName) {
        return [];
    }

    return Attendance.aggregate([
        {
            $match: {
                cliente: { $exists: true, $ne: '' }
            }
        },
        {
            $addFields: {
                clienteNormalizado: {
                    $toLower: {
                        $trim: { input: '$cliente' }
                    }
                }
            }
        },
        {
            $match: {
                clienteNormalizado: validName
            }
        },
        {
            $sort: { fecha: -1, createdAt: -1 }
        },
        {
            $project: {
                _id: 1,
                fecha: 1
            }
        }
    ]);
}

router.get('/', authRequired, async (req, res) => {
    const clientes = await Client.find()
        .select('-foto1 -foto2')
        .sort({ createdAt: -1, _id: -1 });
    const clientesUnicos = dedupeClientsByName(clientes.map((item) => item.toObject()));
    const latestAttendanceByClient = await getLatestAttendanceByClient(clientesUnicos.map((item) => item.nombreNormalizado));

    const response = clientesUnicos.map((cliente) => {
        const latestAttendance = latestAttendanceByClient.get(cliente.nombreNormalizado);
        if (!latestAttendance) {
            return cliente;
        }

        return {
            ...cliente,
            ultimaAtencion: latestAttendance.ultimaAtencion,
            ultimaAtencionPeluquero: latestAttendance.ultimaAtencionPeluquero
        };
    });

    return res.json(response);
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
    const existingByPhone = telefonoNormalizado ? await Client.findOne({ telefonoNormalizado }) : null;
    const existingByName = await Client.findOne({ nombreNormalizado });

    if (
        existingByPhone
        && existingByName
        && String(existingByPhone._id) !== String(existingByName._id)
    ) {
        return res.status(409).json({ error: 'Ya existen clientes duplicados con ese nombre o telefono. Revisa los registros antes de guardar.' });
    }

    const existing = existingByPhone || existingByName;
    if (existing) {
        existing.nombre = fullName;
        existing.nombreNormalizado = nombreNormalizado;
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

    const latestAttendanceByClient = await getLatestAttendanceByClient([cliente.nombreNormalizado]);
    const latestAttendance = latestAttendanceByClient.get(cliente.nombreNormalizado);

    if (!latestAttendance) {
        return res.json(cliente);
    }

    return res.json({
        ...cliente.toObject(),
        ultimaAtencion: latestAttendance.ultimaAtencion,
        ultimaAtencionPeluquero: latestAttendance.ultimaAtencionPeluquero
    });
});

router.get('/:id/atenciones', authRequired, async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Cliente invalido' });
    }

    const cliente = await Client.findById(req.params.id).select('nombre nombreNormalizado');
    if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const atenciones = await getAttendanceHistoryByClient(cliente.nombreNormalizado);

    return res.json({
        clienteId: cliente._id,
        nombre: cliente.nombre,
        total: atenciones.length,
        fechas: atenciones.map((item) => String(item.fecha || '')).filter(Boolean)
    });
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

    const nombreDuplicado = await Client.findOne({
        nombreNormalizado: normalizeName(fullName),
        _id: { $ne: cliente._id }
    });

    if (nombreDuplicado) {
        return res.status(409).json({ error: 'Ya existe otro cliente con ese nombre' });
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
