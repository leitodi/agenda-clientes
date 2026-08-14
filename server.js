require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { version: appVersion } = require('./package.json');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const barberRoutes = require('./src/routes/barbers');
const appointmentRoutes = require('./src/routes/appointments');
const attendanceRoutes = require('./src/routes/attendances');
const reportRoutes = require('./src/routes/reports');
const aiRoutes = require('./src/routes/ai');
const dashboardRoutes = require('./src/routes/dashboard');
const clientRoutes = require('./src/routes/clients');
const serviceRoutes = require('./src/routes/services');
const productRoutes = require('./src/routes/products');
const publicBookingRoutes = require('./src/routes/publicBooking');
const Client = require('./src/models/Client');
const Barber = require('./src/models/Barber');
const Service = require('./src/models/Service');
const Product = require('./src/models/Product');
const Appointment = require('./src/models/Appointment');
const Attendance = require('./src/models/Attendance');
const { ensureSeedData } = require('./src/utils/seed');
const { SERVICE_TYPES } = require('./src/utils/services');
const { normalizeServiceWorkType } = require('./src/utils/serviceWorkTypes');
const { getConfiguredMongoUri, getActiveDbName, LEGACY_DB_NAME } = require('./src/utils/dbConfig');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = getConfiguredMongoUri();
const ACTIVE_DB_NAME = getActiveDbName();
const STATIC_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, proxy-revalidate';
const PUBLIC_DIR = path.join(__dirname, 'public');
const APP_MODE = String(process.env.APP_MODE || 'internal').trim().toLowerCase();
const IS_RESERVATIONS_APP = APP_MODE === 'reservas';

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', STATIC_CACHE_CONTROL);
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
});

function sendInternalApp(res) {
    res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
}

function sendReservationsApp(res) {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
}

app.get('/', (req, res) => {
    if (IS_RESERVATIONS_APP) {
        return sendReservationsApp(res);
    }

    return sendInternalApp(res);
});

app.get('/admin', (req, res) => {
    if (IS_RESERVATIONS_APP) {
        return res.status(404).send('No encontrado');
    }

    return sendInternalApp(res);
});

app.get('/reservas', (req, res) => {
    return sendReservationsApp(res);
});

app.use(express.static(PUBLIC_DIR, {
    etag: false,
    lastModified: false,
    maxAge: 0
}));

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        appVersion,
        appMode: APP_MODE,
        configuredDbName: ACTIVE_DB_NAME,
        dbName: mongoose.connection?.name || '',
        dbHost: mongoose.connection?.host || '',
        readyState: mongoose.connection?.readyState ?? null
    });
});

app.get('/api/config', (req, res) => {
    res.json({
        servicios: SERVICE_TYPES
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/peluqueros', barberRoutes);
app.use('/api/turnos', appointmentRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/servicios', serviceRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/atenciones', attendanceRoutes);
app.use('/api/reportes', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicBookingRoutes);

app.use((error, req, res, next) => {
    console.error('Error no controlado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

async function ensureClientIndexes() {
    const collection = mongoose.connection.collection('clients');

    try {
        const indexes = await collection.indexes();
        const uniqueByName = indexes.find((index) => index.name === 'nombreNormalizado_1' && index.unique);

        if (uniqueByName) {
            await collection.dropIndex('nombreNormalizado_1');
            console.log('Indice unico nombreNormalizado_1 eliminado');
        }
    } catch (error) {
        console.warn('No se pudo revisar/eliminar indice nombreNormalizado_1:', error.message);
    }

    try {
        await collection.createIndex({ nombreNormalizado: 1 }, { name: 'nombreNormalizado_1' });
        await collection.createIndex({ telefonoNormalizado: 1 }, { name: 'telefonoNormalizado_1' });
    } catch (error) {
        console.warn('No se pudieron crear indices de clientes:', error.message);
    }

    try {
        const clientesSinTelefonoNormalizado = await Client.find({
            telefono: { $exists: true, $ne: '' },
            $or: [{ telefonoNormalizado: { $exists: false } }, { telefonoNormalizado: '' }]
        }).select('_id telefono');

        if (clientesSinTelefonoNormalizado.length) {
            const operations = clientesSinTelefonoNormalizado.map((cliente) => ({
                updateOne: {
                    filter: { _id: cliente._id },
                    update: {
                        $set: {
                            telefonoNormalizado: String(cliente.telefono || '').replace(/\D/g, '').trim()
                        }
                    }
                }
            }));

            await Client.bulkWrite(operations);
            console.log(`Clientes actualizados con telefonoNormalizado: ${clientesSinTelefonoNormalizado.length}`);
        }
    } catch (error) {
        console.warn('No se pudo normalizar telefono de clientes existentes:', error.message);
    }
}

async function ensureServiceIndexes() {
    const collection = mongoose.connection.collection('services');

    try {
        const indexes = await collection.indexes();
        const uniqueByName = indexes.find((index) => index.name === 'nombreNormalizado_1' && index.unique);

        if (uniqueByName) {
            await collection.dropIndex('nombreNormalizado_1');
            console.log('Indice unico nombreNormalizado_1 eliminado en servicios');
        }
    } catch (error) {
        console.warn('No se pudo revisar/eliminar indice unico de servicios:', error.message);
    }

    try {
        await collection.createIndex(
            { nombreNormalizado: 1, tipoTrabajo: 1 },
            { name: 'nombreNormalizado_1_tipoTrabajo_1', unique: true }
        );
    } catch (error) {
        console.warn('No se pudo crear indice compuesto de servicios:', error.message);
    }

    try {
        const services = await Service.find().select('_id tipoTrabajo');
        const operations = services
            .map((service) => {
                const normalized = normalizeServiceWorkType(service.tipoTrabajo);
                if (normalized === String(service.tipoTrabajo || '').trim().toLowerCase()) {
                    return null;
                }

                return {
                    updateOne: {
                        filter: { _id: service._id },
                        update: { $set: { tipoTrabajo: normalized } }
                    }
                };
            })
            .filter(Boolean);

        if (operations.length) {
            await Service.bulkWrite(operations);
            console.log(`Servicios actualizados con tipoTrabajo normalizado: ${operations.length}`);
        }
    } catch (error) {
        console.warn('No se pudo normalizar tipoTrabajo en servicios:', error.message);
    }
}

async function ensureProductIndexes() {
    const collection = mongoose.connection.collection('products');

    try {
        const indexes = await collection.indexes();
        const uniqueByName = indexes.find((index) => index.name === 'nombreNormalizado_1' && index.unique);

        if (!uniqueByName) {
            await collection.createIndex(
                { nombreNormalizado: 1 },
                { name: 'nombreNormalizado_1', unique: true }
            );
        }
    } catch (error) {
        console.warn('No se pudo revisar/crear indice de productos:', error.message);
    }
}

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function migrateUppercaseField(model, field, label) {
    try {
        const docs = await model.find({
            [field]: { $exists: true, $ne: '' }
        }).select(`_id ${field}`);

        const operations = docs
            .map((doc) => {
                const currentValue = String(doc[field] || '');
                const upperValue = toUpperTrimmed(currentValue);
                if (!upperValue || upperValue === currentValue) {
                    return null;
                }

                return {
                    updateOne: {
                        filter: { _id: doc._id },
                        update: { $set: { [field]: upperValue } }
                    }
                };
            })
            .filter(Boolean);

        if (operations.length) {
            await model.bulkWrite(operations);
            console.log(`${label} actualizados en mayusculas: ${operations.length}`);
        }
    } catch (error) {
        console.warn(`No se pudieron normalizar ${label}:`, error.message);
    }
}

async function ensureUppercaseData() {
    await migrateUppercaseField(Client, 'nombre', 'clientes.nombre');
    await migrateUppercaseField(Client, 'ultimaAtencionPeluquero', 'clientes.ultimaAtencionPeluquero');
    await migrateUppercaseField(Barber, 'nombre', 'peluqueros.nombre');
    await migrateUppercaseField(Service, 'nombre', 'servicios.nombre');
    await migrateUppercaseField(Product, 'nombre', 'productos.nombre');
    await migrateUppercaseField(Appointment, 'cliente', 'turnos.cliente');
    await migrateUppercaseField(Appointment, 'servicioNombre', 'turnos.servicioNombre');
    await migrateUppercaseField(Attendance, 'cliente', 'atenciones.cliente');
    await migrateUppercaseField(Attendance, 'servicioNombre', 'atenciones.servicioNombre');
    await migrateUppercaseField(Attendance, 'productoNombre', 'atenciones.productoNombre');
}

async function ensureAttendanceClientLinks() {
    try {
        const clients = await Client.find({
            nombreNormalizado: { $exists: true, $ne: '' }
        }).select('_id nombreNormalizado');

        const clientIdsByName = new Map();
        clients.forEach((client) => {
            const key = normalizeName(client.nombreNormalizado);
            if (!key) {
                return;
            }

            const sameNameClients = clientIdsByName.get(key) || [];
            sameNameClients.push(client._id);
            clientIdsByName.set(key, sameNameClients);
        });

        const attendances = await Attendance.find({
            $or: [
                { clientId: { $exists: false } },
                { clientId: null }
            ],
            cliente: { $exists: true, $ne: '' }
        }).select('_id cliente');

        const operations = attendances
            .map((attendance) => {
                const key = normalizeName(attendance.cliente);
                const matchedClientIds = clientIdsByName.get(key) || [];
                if (matchedClientIds.length !== 1) {
                    return null;
                }

                return {
                    updateOne: {
                        filter: { _id: attendance._id },
                        update: { $set: { clientId: matchedClientIds[0] } }
                    }
                };
            })
            .filter(Boolean);

        if (operations.length) {
            await Attendance.bulkWrite(operations);
            console.log(`Atenciones vinculadas a clientes por nombre: ${operations.length}`);
        }
    } catch (error) {
        console.warn('No se pudieron vincular atenciones con clientes:', error.message);
    }
}

async function startServer() {
    try {
        if (String(process.env.MONGODB_DB_NAME || '').trim() === LEGACY_DB_NAME) {
            console.warn(`MONGODB_DB_NAME apuntaba a ${LEGACY_DB_NAME}; se usara ${ACTIVE_DB_NAME}.`);
        }

        if (String(process.env.MONGODB_URI || '').includes(`/${LEGACY_DB_NAME}`)) {
            console.warn(`MONGODB_URI apuntaba a ${LEGACY_DB_NAME}; se usara ${ACTIVE_DB_NAME}.`);
        }

        await mongoose.connect(MONGODB_URI, {
            dbName: ACTIVE_DB_NAME
        });
        console.log(`Conectado a MongoDB (${ACTIVE_DB_NAME})`);

        await ensureClientIndexes();
        await ensureServiceIndexes();
        await ensureProductIndexes();
        await ensureSeedData();
        await ensureUppercaseData();
        await ensureAttendanceClientLinks();

        app.listen(PORT, () => {
            console.log(`Servidor listo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar servidor:', error.message);
        process.exit(1);
    }
}

startServer();
