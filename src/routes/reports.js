const express = require('express');
const Attendance = require('../models/Attendance');
const { authRequired, notAgendaRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/peluqueros', authRequired, notAgendaRequired, async (req, res) => {
    const { desde, hasta } = req.query;

    const filter = {};

    if (desde || hasta) {
        filter.fecha = {
            ...(desde ? { $gte: desde } : {}),
            ...(hasta ? { $lte: hasta } : {})
        };
    }

    const atenciones = await Attendance.find(filter)
        .populate('peluquero', 'nombre')
        .sort({ fecha: 1, createdAt: 1 });

    const grouped = new Map();

    atenciones.forEach((item) => {
        const barberId = item.peluquero?._id?.toString() || 'sin-peluquero';
        const barberName = item.peluquero?.nombre || 'Sin peluquero';

        if (!grouped.has(barberId)) {
            grouped.set(barberId, {
                peluqueroId: barberId,
                peluqueroNombre: barberName,
                totalCobrado: 0,
                totalComision: 0,
                registros: []
            });
        }

        const target = grouped.get(barberId);
        target.totalCobrado += item.montoCobrado;
        target.totalComision += item.comisionGanada;
        target.registros.push({
            fecha: item.fecha,
            cliente: item.cliente,
            montoCobrado: item.montoCobrado,
            comisionGanada: item.comisionGanada
        });
    });

    const response = Array.from(grouped.values()).map((group) => ({
        ...group,
        totalCobrado: Number(group.totalCobrado.toFixed(2)),
        totalComision: Number(group.totalComision.toFixed(2))
    }));

    return res.json(response);
});

module.exports = router;
