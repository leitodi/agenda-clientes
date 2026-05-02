const express = require('express');
const Attendance = require('../models/Attendance');
const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const Client = require('../models/Client');
const { authRequired } = require('../middleware/auth');
const { parseTimeToMinutes } = require('../utils/time');
const { getLegacyAttendancesByDateRange } = require('../utils/legacyAttendanceStore');
const { findServiceById } = require('../utils/serviceStore');
const { findProductById } = require('../utils/productStore');

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
        .populate('productoId', 'nombre precio comisionMonto')
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
        servicioId,
        productoId,
        tipoVenta
    } = req.body;

    const tipoVentaNormalizado = String(tipoVenta || 'servicio').trim().toLowerCase();
    if (!['servicio', 'producto'].includes(tipoVentaNormalizado)) {
        return res.status(400).json({ error: 'Tipo de venta invalido' });
    }

    if (!isValidDateString(fecha) || !peluqueroId) {
        return res.status(400).json({ error: 'Fecha y peluquero son requeridos' });
    }

    if (tipoVentaNormalizado === 'servicio' && !servicioId) {
        return res.status(400).json({ error: 'Debes seleccionar un servicio' });
    }

    if (tipoVentaNormalizado === 'producto' && !productoId) {
        return res.status(400).json({ error: 'Debes seleccionar un producto' });
    }

    const formaPagoNormalizada = String(formaPago || '').trim().toLowerCase();
    if (!['efectivo', 'transferencia', 'tarjeta'].includes(formaPagoNormalizada)) {
        return res.status(400).json({ error: 'Forma de pago invalida' });
    }

    let monto = Number(montoCobrado);
    let servicio = null;
    let servicioNombre = '';
    let producto = null;
    let productoNombre = '';

    if (tipoVentaNormalizado === 'servicio') {
        if (!/^[a-fA-F0-9]{24}$/.test(String(servicioId))) {
            return res.status(400).json({ error: 'Servicio invalido' });
        }
        servicio = await findServiceById(servicioId);
        if (!servicio) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        monto = Number(servicio.precio);
        servicioNombre = servicio.nombre;
    } else {
        if (!/^[a-fA-F0-9]{24}$/.test(String(productoId))) {
            return res.status(400).json({ error: 'Producto invalido' });
        }
        producto = await findProductById(productoId);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        monto = Number(producto.precio);
        productoNombre = producto.nombre;
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
    const comisionGanada = tipoVentaNormalizado === 'producto'
        ? Number(Number(producto.comisionMonto || 0).toFixed(2))
        : Number(((monto * barber.porcentajeComision) / 100).toFixed(2));

    const atencion = await Attendance.create({
        fecha,
        cliente: clienteNombreFinal,
        clientId: clienteExistente?._id || null,
        tipoVenta: tipoVentaNormalizado,
        servicioNombre,
        servicioId: servicio?.source === 'primary' ? servicio._id : undefined,
        productoNombre,
        productoId: producto?._id || null,
        formaPago: formaPagoNormalizada,
        montoCobrado: monto,
        comisionTipo: tipoVentaNormalizado === 'producto' ? 'monto' : 'porcentaje',
        comisionPorcentaje: tipoVentaNormalizado === 'producto' ? 0 : barber.porcentajeComision,
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

    const turnoAtendido = tipoVentaNormalizado === 'servicio'
        ? await marcarTurnoAtendidoSiCorresponde({
            fecha,
            horaReferencia,
            clienteNombre: clienteNombreFinal,
            clienteId: clienteExistente?._id || null
        })
        : null;

    const populated = await Attendance.findById(atencion._id)
        .populate('peluquero', 'nombre porcentajeComision')
        .populate('servicioId', 'nombre precio')
        .populate('productoId', 'nombre precio comisionMonto');

    return res.status(201).json({
        ...populated.toObject(),
        turnoMarcadoAtendido: Boolean(turnoAtendido),
        turnoActualizadoId: turnoAtendido?._id || null
    });
});

module.exports = router;
