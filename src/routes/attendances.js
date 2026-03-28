const express = require('express');
const Attendance = require('../models/Attendance');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const Client = require('../models/Client');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function isValidDateString(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

router.get('/', authRequired, async (req, res) => {
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
        .populate('servicioId', 'nombre precio')
        .sort({ fecha: -1, createdAt: -1 });

    return res.json(atenciones);
});

router.post('/', authRequired, async (req, res) => {
    const { fecha, peluqueroId, cliente, formaPago, montoCobrado, servicioId } = req.body;

    if (!isValidDateString(fecha) || !peluqueroId || (!servicioId && montoCobrado === undefined)) {
        return res.status(400).json({ error: 'Fecha, peluquero y servicio son requeridos' });
    }

    const formaPagoNormalizada = String(formaPago || '').trim().toLowerCase();
    if (!['efectivo', 'transferencia', 'tarjeta'].includes(formaPagoNormalizada)) {
        return res.status(400).json({ error: 'Forma de pago invalida' });
    }

    let monto = Number(montoCobrado);
    let servicio = null;
    let servicioNombre = '';

    if (servicioId) {
        if (!/^[a-fA-F0-9]{24}$/.test(String(servicioId))) {
            return res.status(400).json({ error: 'Servicio invalido' });
        }
        servicio = await Service.findById(servicioId);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        monto = Number(servicio.precio);
        servicioNombre = servicio.nombre;
    }

    if (Number.isNaN(monto) || monto < 0) {
        return res.status(400).json({ error: 'Monto invalido' });
    }

    const barber = await Barber.findById(peluqueroId);

    if (!barber) {
        return res.status(404).json({ error: 'Peluquero no encontrado' });
    }

    const comisionGanada = Number(((monto * barber.porcentajeComision) / 100).toFixed(2));

    const atencion = await Attendance.create({
        fecha,
        cliente: String(cliente || '').trim(),
        servicioNombre,
        servicioId: servicio?._id || undefined,
        formaPago: formaPagoNormalizada,
        montoCobrado: monto,
        comisionPorcentaje: barber.porcentajeComision,
        comisionGanada,
        peluquero: barber._id,
        registradoPor: req.user.id
    });

    const clienteNombre = String(cliente || '').trim();
    if (clienteNombre) {
        const clienteNormalizado = normalizeName(clienteNombre);
        const clienteExistente = await Client.findOne({ nombreNormalizado: clienteNormalizado });

        if (clienteExistente) {
            const fechaActual = String(clienteExistente.ultimaAtencion || '').trim();
            if (!fechaActual || fecha >= fechaActual) {
                clienteExistente.ultimaAtencion = fecha;
                clienteExistente.ultimaAtencionPeluquero = String(barber.nombre || '').trim();
                await clienteExistente.save();
            }
        }
    }

    const populated = await Attendance.findById(atencion._id)
        .populate('peluquero', 'nombre porcentajeComision')
        .populate('servicioId', 'nombre precio');

    return res.status(201).json(populated);
});

module.exports = router;
