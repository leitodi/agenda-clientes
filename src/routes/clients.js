const express = require('express');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');
const { authRequired } = require('../middleware/auth');
const { getLegacyAttendanceRowsByClient } = require('../utils/legacyAttendanceStore');

const router = express.Router();

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNameForAttendanceMatch(value) {
    return normalizeName(value).replace(/\s+/g, '');
}

function getClientComparableName(client) {
    return String(client?.nombre || client?.nombreNormalizado || '').trim();
}

function getClientAttendanceKey(client) {
    const clientId = String(client?._id || '').trim();
    if (clientId) {
        return clientId;
    }

    return normalizeNameForAttendanceMatch(getClientComparableName(client));
}

function buildAttendanceComparableExpression(fieldPath) {
    return {
        $replaceAll: {
            input: {
                $toLower: {
                    $trim: { input: fieldPath }
                }
            },
            find: ' ',
            replacement: ''
        }
    };
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

async function getAttendanceRowsByClient(clients) {
    const validClients = (clients || [])
        .map((client) => ({
            key: getClientAttendanceKey(client),
            clientId: String(client?._id || '').trim(),
            comparableName: normalizeNameForAttendanceMatch(getClientComparableName(client))
        }))
        .filter((client) => client.key);

    if (!validClients.length) {
        return new Map();
    }

    const validClientIds = Array.from(new Set(
        validClients
            .map((client) => client.clientId)
            .filter((clientId) => mongoose.Types.ObjectId.isValid(clientId))
    )).map((clientId) => new mongoose.Types.ObjectId(clientId));

    const validNames = Array.from(new Set(
        validClients
            .map((client) => client.comparableName)
            .filter(Boolean)
    ));

    const attendanceFilters = [];
    if (validClientIds.length) {
        attendanceFilters.push({ clientId: { $in: validClientIds } });
    }
    if (validNames.length) {
        attendanceFilters.push({ clienteNormalizado: { $in: validNames } });
    }

    if (!attendanceFilters.length) {
        return new Map(validClients.map((client) => [client.key, []]));
    }

    const rows = await Attendance.aggregate([
        {
            $addFields: {
                clienteNormalizado: {
                    $cond: [
                        { $ifNull: ['$cliente', false] },
                        buildAttendanceComparableExpression('$cliente'),
                        ''
                    ]
                },
                clientIdTexto: {
                    $cond: [
                        { $ifNull: ['$clientId', false] },
                        { $toString: '$clientId' },
                        ''
                    ]
                }
            }
        },
        {
            $match: {
                $or: attendanceFilters
            }
        },
        {
            $sort: { fecha: -1, createdAt: -1 }
        },
        {
            $project: {
                _id: 1,
                fecha: 1,
                servicioNombre: 1,
                peluqueroId: '$peluquero',
                clienteNormalizado: 1,
                clientIdTexto: 1
            }
        }
    ]);

    const rowsByClient = new Map(validClients.map((client) => [client.key, []]));
    const clientsById = new Map(
        validClients
            .filter((client) => client.clientId)
            .map((client) => [client.clientId, client])
    );
    const clientsByName = new Map();

    validClients.forEach((client) => {
        if (!client.comparableName) {
            return;
        }

        const sameNameClients = clientsByName.get(client.comparableName) || [];
        sameNameClients.push(client);
        clientsByName.set(client.comparableName, sameNameClients);
    });

    rows.forEach((row) => {
        const rowClientId = String(row.clientIdTexto || '').trim();
        const rowName = String(row.clienteNormalizado || '').trim();

        if (rowClientId && clientsById.has(rowClientId)) {
            rowsByClient.get(clientsById.get(rowClientId).key)?.push(row);
            return;
        }

        const matchedClients = clientsByName.get(rowName) || [];
        if (matchedClients.length !== 1) {
            return;
        }

        rowsByClient.get(matchedClients[0].key)?.push(row);
    });

    const missingClients = (clients || []).filter((client) => !(rowsByClient.get(getClientAttendanceKey(client)) || []).length);
    if (missingClients.length) {
        const legacyRowsByClient = await getLegacyAttendanceRowsByClient(missingClients);
        legacyRowsByClient.forEach((legacyRows, key) => {
            if (!legacyRows.length || (rowsByClient.get(key) || []).length) {
                return;
            }

            rowsByClient.set(key, legacyRows);
        });
    }

    return rowsByClient;
}

async function getLatestAttendanceByClient(clients) {
    const rowsByClient = await getAttendanceRowsByClient(clients);
    const latestRows = Array.from(rowsByClient.values())
        .map((rows) => rows[0])
        .filter(Boolean);

    const peluqueroIds = latestRows
        .map((row) => String(row.peluqueroId || '').trim())
        .filter(Boolean);

    const peluqueros = peluqueroIds.length
        ? await mongoose.model('Barber').find({ _id: { $in: peluqueroIds } }).select('nombre')
        : [];

    const peluquerosById = new Map(peluqueros.map((item) => [String(item._id), item.nombre]));

    return new Map((clients || []).map((client) => {
        const key = getClientAttendanceKey(client);
        const row = rowsByClient.get(key)?.[0] || null;
        if (!row) {
            return [key, null];
        }

        return [
            key,
            {
                ultimaAtencion: String(row.fecha || ''),
                ultimaAtencionPeluquero: peluquerosById.get(String(row.peluqueroId || '')) || ''
            }
        ];
    }));
}

async function getAttendanceHistoryByClient(client) {
    const key = getClientAttendanceKey(client);
    if (!key) {
        return [];
    }

    const rowsByClient = await getAttendanceRowsByClient([client]);
    const rows = rowsByClient.get(key) || [];

    const peluqueroIds = rows
        .map((row) => String(row.peluqueroId || '').trim())
        .filter(Boolean);

    const peluqueros = peluqueroIds.length
        ? await mongoose.model('Barber').find({ _id: { $in: peluqueroIds } }).select('nombre')
        : [];

    const peluquerosById = new Map(peluqueros.map((item) => [String(item._id), item.nombre]));

    return rows.map((row) => ({
        _id: row._id,
        fecha: String(row.fecha || ''),
        servicioNombre: String(row.servicioNombre || '').trim(),
        peluqueroNombre: peluquerosById.get(String(row.peluqueroId || '')) || ''
    }));
}

router.get('/', authRequired, async (req, res) => {
    const clientes = await Client.find()
        .select('-foto1 -foto2')
        .sort({ createdAt: -1, _id: -1 });
    const latestAttendanceByClient = await getLatestAttendanceByClient(clientes);

    const response = clientes.map((cliente) => {
        const latestAttendance = latestAttendanceByClient.get(getClientAttendanceKey(cliente));
        if (!latestAttendance) {
            return cliente.toObject();
        }

        return {
            ...cliente.toObject(),
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
    const existing = existingByPhone;
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

    const latestAttendanceByClient = await getLatestAttendanceByClient([cliente]);
    const latestAttendance = latestAttendanceByClient.get(getClientAttendanceKey(cliente));

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

    const cliente = await Client.findById(req.params.id).select('nombre nombreNormalizado telefonoNormalizado');
    if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const atenciones = await getAttendanceHistoryByClient(cliente);

    return res.json({
        clienteId: cliente._id,
        nombre: cliente.nombre,
        total: atenciones.length,
        fechas: atenciones.map((item) => String(item.fecha || '')).filter(Boolean),
        atenciones
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
