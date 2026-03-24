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
app.use('/api/atenciones', attendanceRoutes);
app.use('/api/reportes', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((error, req, res, next) => {
    console.error('Error no controlado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');

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
