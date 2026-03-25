require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const barberRoutes = require('./src/routes/barbers');
const appointmentRoutes = require('./src/routes/appointments');
const attendanceRoutes = require('./src/routes/attendances');
const reportRoutes = require('./src/routes/reports');
const dashboardRoutes = require('./src/routes/dashboard');
const clientRoutes = require('./src/routes/clients');
const serviceRoutes = require('./src/routes/services');
const Client = require('./src/models/Client');
const { ensureSeedData } = require('./src/utils/seed');
const { SERVICE_TYPES } = require('./src/utils/services');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agenda_peluqueria';

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
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
app.use('/api/atenciones', attendanceRoutes);
app.use('/api/reportes', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

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

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');

        await ensureClientIndexes();
        await ensureSeedData();

        app.listen(PORT, () => {
            console.log(`Servidor listo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar servidor:', error.message);
        process.exit(1);
    }
}

startServer();
