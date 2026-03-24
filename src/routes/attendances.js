const express = require('express');
const Attendance = require('../models/Attendance');
const Barber = require('../models/Barber');
const { authRequired, notAgendaRequired } = require('../middleware/auth');

const router = express.Router();

function isValidDateString(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

router.get('/', authRequired, notAgendaRequired, async (req, res) => {
    const { desde, hasta, peluqueroId } = req.query;
    const filter = {};

    if (peluqueroId) {
        filter.peluquero = peluqueroId;
    }

    if (desde || hasta) {
        filter.fecha = {
            ...(desde ? { $gte: desde } : {}),
            ...(hasta ? { $lte: hasta } : {})
        };
    }

    const atenciones = await Attendance.find(filter)
        .populate('peluquero', 'nombre porcentajeComision')
        .sort({ fecha: -1, createdAt: -1 });

    return res.json(atenciones);
});

router.post('/', authRequired, notAgendaRequired, async (req, res) => {
    const { fecha, peluqueroId, cliente, formaPago, montoCobrado } = req.body;

    if (!isValidDateString(fecha) || !peluqueroId || montoCobrado === undefined) {
        return res.status(400).json({ error: 'Fecha, peluquero y monto son requeridos' });
    }

    const monto = Number(montoCobrado);
    if (Number.isNaN(monto) || monto < 0) {
        return res.status(400).json({ error: 'Monto invalido' });
    }

    const formaPagoNormalizada = String(formaPago || '').trim().toLowerCase();
    if (!['efectivo', 'transferencia'].includes(formaPagoNormalizada)) {
        return res.status(400).json({ error: 'Forma de pago invalida' });
    }

    const barber = await Barber.findById(peluqueroId);

    if (!barber) {
        return res.status(404).json({ error: 'Peluquero no encontrado' });
    }

    const comisionGanada = Number(((monto * barber.porcentajeComision) / 100).toFixed(2));

    const atencion = await Attendance.create({
        fecha,
        cliente: String(cliente || '').trim(),
        formaPago: formaPagoNormalizada,
        montoCobrado: monto,
        comisionPorcentaje: barber.porcentajeComision,
        comisionGanada,
        peluquero: barber._id,
        registradoPor: req.user.id
    });

    const populated = await Attendance.findById(atencion._id)
        .populate('peluquero', 'nombre porcentajeComision');

    return res.status(201).json(populated);
});

module.exports = router;
