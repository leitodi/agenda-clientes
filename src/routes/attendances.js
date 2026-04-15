const express = require('express');
const Attendance = require('../models/Attendance');
const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const Client = require('../models/Client');
const { authRequired } = require('../middleware/auth');
const { parseTimeToMinutes } = require('../utils/time');
const { getLegacyAttendancesByDateRange } = require('../utils/legacyAttendanceStore');

const router = express.Router();
const TURNO_CAJA_TOLERANCIA_MINUTOS = 120;

function isValidDateString(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

function isValidTimeString(value) {
    return /^\d{2}:\d{2}$/.test(String(value || ''));
}

async function marcarTurnoAtendidoSiCorresponde({
    fecha,
    horaReferencia,
    clienteNombre,
    clienteId
}) {
    if (!isValidDateString(fecha) || !isValidTimeString(horaReferencia)) {
        return null;
    }

    const clienteMayusculas = toUpperTrimmed(clienteNombre);
    if (!clienteMayusculas && !clienteId) {
        return null;
    }

    const horaMinutos = parseTimeToMinutes(horaReferencia);
    const filtroClientes = [];

    if (clienteId) {
        filtroClientes.push({ clienteId });
    }

    if (clienteMayusculas) {
        filtroClientes.push({ cliente: clienteMayusculas });
    }

    if (!filtroClientes.length) {
        return null;
    }

    const candidatos = await Appointment.find({
        fecha,
        estado: 'pendiente',
        $or: filtroClientes
    }).sort({ inicioMinutos: 1, createdAt: 1 });

    if (!candidatos.length) {
        return null;
    }

    const candidatosEnHorario = candidatos.filter((turno) => (
        horaMinutos >= Number(turno.inicioMinutos)
        && horaMinutos < Number(turno.finMinutos)
    ));

    const candidatosConTolerancia = candidatos.filter((turno) => (
        horaMinutos >= Number(turno.inicioMinutos)
        && horaMinutos <= (Number(turno.finMinutos) + TURNO_CAJA_TOLERANCIA_MINUTOS)
    ));

    const turnoElegido = candidatosEnHorario[0] || candidatosConTolerancia[0] || null;
    if (!turnoElegido) {
        return null;
    }

    turnoElegido.estado = 'atendido';
    turnoElegido.estadoActualizadoEn = new Date();
    await turnoElegido.save();

    return turnoElegido;
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

    let atenciones = await Attendance.find(filter)
        .populate('peluquero', 'nombre porcentajeComision')
        .populate('servicioId', 'nombre precio')
        .sort({ fecha: -1, createdAt: -1 });

    if (!atenciones.length) {
        atenciones = await getLegacyAttendancesByDateRange({ desde, hasta, peluqueroId });
    }

    return res.json(atenciones);
});

router.post('/', authRequired, async (req, res) => {
    const {
        fecha,
        horaReferencia,
        peluqueroId,
        cliente,
        clienteId,
        formaPago,
        montoCobrado,
        servicioId
    } = req.body;

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

    const clienteIdNormalizado = String(clienteId || '').trim();
    if (clienteIdNormalizado && !/^[a-fA-F0-9]{24}$/.test(clienteIdNormalizado)) {
        return res.status(400).json({ error: 'Cliente invalido' });
    }

    const clienteNombreIngresado = String(cliente || '').trim();
    let clienteExistente = null;

    if (clienteIdNormalizado) {
        clienteExistente = await Client.findById(clienteIdNormalizado);
        if (!clienteExistente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
    } else if (clienteNombreIngresado) {
        const clienteNormalizado = normalizeName(clienteNombreIngresado);
        clienteExistente = await Client.findOne({ nombreNormalizado: clienteNormalizado });
    }

    const clienteNombreFinal = String(clienteExistente?.nombre || clienteNombreIngresado).trim();
    const comisionGanada = Number(((monto * barber.porcentajeComision) / 100).toFixed(2));

    const atencion = await Attendance.create({
        fecha,
        cliente: clienteNombreFinal,
        clientId: clienteExistente?._id || null,
        servicioNombre,
        servicioId: servicio?._id || undefined,
        formaPago: formaPagoNormalizada,
        montoCobrado: monto,
        comisionPorcentaje: barber.porcentajeComision,
        comisionGanada,
        peluquero: barber._id,
        registradoPor: req.user.id
    });

    if (clienteExistente) {
        const fechaActual = String(clienteExistente.ultimaAtencion || '').trim();
        if (!fechaActual || fecha >= fechaActual) {
            clienteExistente.ultimaAtencion = fecha;
            clienteExistente.ultimaAtencionPeluquero = String(barber.nombre || '').trim();
            await clienteExistente.save();
        }
    }

    const turnoAtendido = await marcarTurnoAtendidoSiCorresponde({
        fecha,
        horaReferencia,
        clienteNombre: clienteNombreFinal,
        clienteId: clienteExistente?._id || null
    });

    const populated = await Attendance.findById(atencion._id)
        .populate('peluquero', 'nombre porcentajeComision')
        .populate('servicioId', 'nombre precio');

    return res.status(201).json({
        ...populated.toObject(),
        turnoMarcadoAtendido: Boolean(turnoAtendido),
        turnoActualizadoId: turnoAtendido?._id || null
    });
});

module.exports = router;
