const express = require('express');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');
const Barber = require('../models/Barber');
const { authRequired, notAgendaRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, notAgendaRequired, async (req, res) => {
    const { fecha } = req.query;

    const [turnos, atenciones, peluqueros] = await Promise.all([
        Appointment.countDocuments(fecha ? { fecha } : {}),
        Attendance.countDocuments(fecha ? { fecha } : {}),
        Barber.countDocuments({ activo: true })
    ]);

    return res.json({
        fecha: fecha || null,
        totalTurnos: turnos,
        totalAtenciones: atenciones,
        peluquerosActivos: peluqueros
    });
});

module.exports = router;
