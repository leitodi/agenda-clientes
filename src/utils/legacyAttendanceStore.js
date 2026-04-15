const mongoose = require('mongoose');

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNameForAttendanceMatch(value) {
    return normalizeName(value).replace(/\s+/g, '');
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

async function getLegacyConnection() {
    if (mongoose.connection.readyState !== 1) {
        return null;
    }

    return mongoose.connection.useDb('agenda_clientes', { useCache: true });
}

async function getLegacyBirthdayData() {
    const connection = await getLegacyConnection();
    if (!connection) {
        return {
            clientes: [],
            peluqueros: []
        };
    }

    const [legacyClients, legacyBarbers] = await Promise.all([
        connection.collection('clients')
            .find({ fechaCumpleanos: { $exists: true, $ne: '' } }, {
                projection: {
                    nombre: 1,
                    telefono: 1,
                    telefonoNormalizado: 1,
                    fechaCumpleanos: 1
                }
            })
            .toArray(),
        connection.collection('barbers')
            .find({ fechaCumpleanos: { $exists: true, $ne: '' } }, {
                projection: {
                    nombre: 1,
                    telefono: 1,
                    fechaCumpleanos: 1
                }
            })
            .toArray()
    ]);

    return {
        clientes: legacyClients
            .map((doc) => ({
                _id: String(doc._id || '').trim(),
                nombre: String(doc.nombre || '').trim(),
                telefono: String(doc.telefono || '').trim(),
                telefonoNormalizado: normalizePhone(doc.telefonoNormalizado || doc.telefono),
                fechaCumpleanos: normalizeOptionalBirthday(doc.fechaCumpleanos)
            }))
            .filter((doc) => doc.nombre && doc.fechaCumpleanos),
        peluqueros: legacyBarbers
            .map((doc) => ({
                _id: String(doc._id || '').trim(),
                nombre: String(doc.nombre || '').trim(),
                telefono: String(doc.telefono || '').trim(),
                fechaCumpleanos: normalizeOptionalBirthday(doc.fechaCumpleanos)
            }))
            .filter((doc) => doc.nombre && doc.fechaCumpleanos)
    };
}

async function getLegacyBarberNamesById(barberIds) {
    const connection = await getLegacyConnection();
    if (!connection || !barberIds.length) {
        return new Map();
    }

    const docs = await connection.collection('barbers')
        .find({ _id: { $in: barberIds } }, { projection: { nombre: 1 } })
        .toArray();

    return new Map(docs.map((doc) => [String(doc._id), String(doc.nombre || '').trim()]));
}

async function getLegacyAttendancesByDateRange({ desde, hasta, peluqueroId }) {
    const connection = await getLegacyConnection();
    if (!connection) {
        return [];
    }

    const filter = {};
    if (peluqueroId && mongoose.Types.ObjectId.isValid(String(peluqueroId))) {
        filter.peluquero = new mongoose.Types.ObjectId(String(peluqueroId));
    }

    if (desde || hasta) {
        filter.fecha = {
            ...(desde ? { $gte: desde } : {}),
            ...(hasta ? { $lte: hasta } : {})
        };
    }

    const rows = await connection.collection('attendances')
        .find(filter)
        .sort({ fecha: -1, createdAt: -1 })
        .toArray();

    const barberIds = Array.from(new Set(
        rows
            .map((row) => String(row.peluquero || '').trim())
            .filter((value) => mongoose.Types.ObjectId.isValid(value))
    )).map((value) => new mongoose.Types.ObjectId(value));

    const barberNamesById = await getLegacyBarberNamesById(barberIds);

    return rows.map((row) => ({
        ...row,
        peluquero: row.peluquero
            ? {
                _id: row.peluquero,
                nombre: barberNamesById.get(String(row.peluquero)) || ''
            }
            : null
    }));
}

async function getLegacyAttendanceRowsByClient(clients) {
    const validClients = (clients || [])
        .map((client) => ({
            key: String(client?._id || '').trim() || normalizeNameForAttendanceMatch(client?.nombre || client?.nombreNormalizado),
            comparableName: normalizeNameForAttendanceMatch(client?.nombre || client?.nombreNormalizado),
            telefonoNormalizado: String(client?.telefonoNormalizado || '').trim()
        }))
        .filter((client) => client.key);

    if (!validClients.length) {
        return new Map();
    }

    const connection = await getLegacyConnection();
    if (!connection) {
        return new Map(validClients.map((client) => [client.key, []]));
    }

    const phones = Array.from(new Set(validClients.map((client) => client.telefonoNormalizado).filter(Boolean)));
    const names = Array.from(new Set(validClients.map((client) => client.comparableName).filter(Boolean)));

    const legacyClients = await connection.collection('clients').aggregate([
        {
            $addFields: {
                comparableName: {
                    $replaceAll: {
                        input: {
                            $toLower: {
                                $trim: { input: { $ifNull: ['$nombre', '$nombreNormalizado'] } }
                            }
                        },
                        find: ' ',
                        replacement: ''
                    }
                }
            }
        },
        {
            $match: {
                $or: [
                    ...(phones.length ? [{ telefonoNormalizado: { $in: phones } }] : []),
                    ...(names.length ? [{ comparableName: { $in: names } }] : [])
                ]
            }
        },
        {
            $project: {
                _id: 1,
                comparableName: 1,
                telefonoNormalizado: 1
            }
        }
    ]).toArray();

    const keysByLegacyClientId = new Map();
    const keysByName = new Map();
    const keysByPhone = new Map();

    validClients.forEach((client) => {
        if (client.comparableName) {
            const sameName = keysByName.get(client.comparableName) || [];
            sameName.push(client.key);
            keysByName.set(client.comparableName, sameName);
        }

        if (client.telefonoNormalizado) {
            const samePhone = keysByPhone.get(client.telefonoNormalizado) || [];
            samePhone.push(client.key);
            keysByPhone.set(client.telefonoNormalizado, samePhone);
        }
    });

    legacyClients.forEach((legacyClient) => {
        const phoneKeys = keysByPhone.get(String(legacyClient.telefonoNormalizado || '').trim()) || [];
        const nameKeys = keysByName.get(String(legacyClient.comparableName || '').trim()) || [];
        const matchedKeys = phoneKeys.length ? phoneKeys : nameKeys;
        if (matchedKeys.length !== 1) {
            return;
        }

        keysByLegacyClientId.set(String(legacyClient._id), matchedKeys[0]);
    });

    const legacyClientIds = Array.from(keysByLegacyClientId.keys()).map((value) => new mongoose.Types.ObjectId(value));
    const attendanceFilters = [];
    if (legacyClientIds.length) {
        attendanceFilters.push({ clientId: { $in: legacyClientIds } });
    }
    if (names.length) {
        attendanceFilters.push({
            clienteNormalizado: { $in: names }
        });
    }

    if (!attendanceFilters.length) {
        return new Map(validClients.map((client) => [client.key, []]));
    }

    const rows = await connection.collection('attendances').aggregate([
        {
            $addFields: {
                clienteNormalizado: {
                    $replaceAll: {
                        input: {
                            $toLower: {
                                $trim: { input: { $ifNull: ['$cliente', ''] } }
                            }
                        },
                        find: ' ',
                        replacement: ''
                    }
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
    ]).toArray();

    const rowsByClient = new Map(validClients.map((client) => [client.key, []]));

    rows.forEach((row) => {
        const rowClientId = String(row.clientIdTexto || '').trim();
        if (rowClientId && keysByLegacyClientId.has(rowClientId)) {
            rowsByClient.get(keysByLegacyClientId.get(rowClientId))?.push(row);
            return;
        }

        const matchedKeys = keysByName.get(String(row.clienteNormalizado || '').trim()) || [];
        if (matchedKeys.length !== 1) {
            return;
        }

        rowsByClient.get(matchedKeys[0])?.push(row);
    });

    return rowsByClient;
}

module.exports = {
    getLegacyAttendancesByDateRange,
    getLegacyAttendanceRowsByClient,
    getLegacyBirthdayData
};
