const express = require('express');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');
const Barber = require('../models/Barber');
const { authRequired, notAgendaRequired } = require('../middleware/auth');
const { getLegacyAttendancesByDateRange } = require('../utils/legacyAttendanceStore');

const router = express.Router();

router.get('/', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const { fecha } = req.query;
        const attendanceFilter = fecha ? { fecha } : {};

        const [turnosResult, atencionesResult, peluquerosResult] = await Promise.allSettled([
            Appointment.countDocuments(attendanceFilter),
            Attendance.countDocuments(attendanceFilter),
            Barber.countDocuments({ activo: true })
        ]);

        let totalAtenciones = atencionesResult.status === 'fulfilled' ? atencionesResult.value : 0;
        if (!totalAtenciones && fecha) {
            try {
                const legacyRows = await getLegacyAttendancesByDateRange({ desde: fecha, hasta: fecha });
                totalAtenciones = legacyRows.length;
            } catch (legacyError) {
                console.warn('No se pudo consultar atenciones legacy para dashboard:', legacyError.message);
            }
        }

        return res.json({
            fecha: fecha || null,
            totalTurnos: turnosResult.status === 'fulfilled' ? turnosResult.value : 0,
            totalAtenciones,
            peluquerosActivos: peluquerosResult.status === 'fulfilled' ? peluquerosResult.value : 0
        });
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        return res.json({
            fecha: req.query?.fecha || null,
            totalTurnos: 0,
            totalAtenciones: 0,
            peluquerosActivos: 0
        });
    }
});

module.exports = router;
