const express = require('express');
const Appointment = require('../models/Appointment');
const Barber = require('../models/Barber');
const Client = require('../models/Client');
const { authRequired, notAgendaRequired } = require('../middleware/auth');
const { parseTimeToMinutes, minutesToTime, getDayOfWeek, getDayName } = require('../utils/time');
const { getServiceDuration } = require('../utils/services');
const { findServiceById } = require('../utils/serviceStore');

const router = express.Router();
const OPENING_MINUTES = 10 * 60;
const CLOSING_MINUTES = 22 * 60;
const APPOINTMENT_STATUSES = new Set(['pendiente', 'atendido', 'perdido']);

function isValidDateString(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function validarDisponibilidadEnAgenda(barber, fecha, inicioMinutos, finMinutos) {
    const dayOfWeek = getDayOfWeek(fecha);
    const horariosDelDia = barber.agenda.filter((slot) => slot.dayOfWeek === dayOfWeek);

    if (horariosDelDia.length === 0) {
        throw new Error(`El peluquero no trabaja los ${getDayName(dayOfWeek)}`);
    }

    const dentroDeHorario = horariosDelDia.some((slot) => {
        const inicioSlot = parseTimeToMinutes(slot.start);
        const finSlot = parseTimeToMinutes(slot.end);
        return inicioMinutos >= inicioSlot && finMinutos <= finSlot;
    });

    if (!dentroDeHorario) {
        throw new Error('Turno fuera del horario del peluquero');
    }
}

function validarHorarioGeneral(fecha, inicioMinutos, finMinutos) {
    const dayOfWeek = getDayOfWeek(fecha);

    if (dayOfWeek === 0) {
        throw new Error('Solo se pueden reservar turnos de lunes a sabado');
    }

    if (inicioMinutos < OPENING_MINUTES || finMinutos > CLOSING_MINUTES) {
        throw new Error('Horario permitido: de 10:00 a 22:00');
    }
}

async function validarSuperposicion({ peluqueroId, fecha, inicioMinutos, finMinutos, turnoIdExcluir }) {
    const conflictivo = await Appointment.findOne({
        peluquero: peluqueroId,
        fecha,
        ...(turnoIdExcluir ? { _id: { $ne: turnoIdExcluir } } : {}),
        inicioMinutos: { $lt: finMinutos },
        finMinutos: { $gt: inicioMinutos }
    });

    if (conflictivo) {
        throw new Error('Ya existe un turno superpuesto para ese peluquero');
    }
}

function normalizarNombreCliente(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizarEstadoTurno(value) {
    return String(value || '').trim().toLowerCase();
}

async function resolverServicioTurno({ servicioId, servicioLegacy }) {
    const servicioIdFinal = String(servicioId || servicioLegacy || '').trim();

    if (/^[a-fA-F0-9]{24}$/.test(servicioIdFinal)) {
        const servicio = await findServiceById(servicioIdFinal);
        if (!servicio) {
            throw new Error('Servicio no encontrado');
        }

        const duracionMinutos = Number(servicio.duracionMinutos || 30);
        if (!Number.isInteger(duracionMinutos) || duracionMinutos <= 0) {
            throw new Error('El servicio seleccionado no tiene una duracion valida');
        }

        return {
            servicio: servicio._id.toString(),
            servicioId: servicio.source === 'primary' ? servicio._id : null,
            servicioNombre: servicio.nombre,
            duracionMinutos
        };
    }

    const legacyKey = String(servicioLegacy || '').trim();
    if (!legacyKey) {
        throw new Error('Servicio invalido');
    }

    return {
        servicio: legacyKey,
        servicioId: null,
        servicioNombre: '',
        duracionMinutos: getServiceDuration(legacyKey)
    };
}

async function resolverCliente({ clienteId, clienteNombre, foto1, foto2, fecha, peluqueroNombre }) {
    if (clienteId) {
        const cliente = await Client.findById(clienteId);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        if (foto1) {
            cliente.foto1 = foto1;
        }
        if (foto2) {
            cliente.foto2 = foto2;
        }
        await cliente.save();

        return {
            clienteId: cliente._id,
            clienteNombreFinal: cliente.nombre
        };
    }

    const nombre = String(clienteNombre || '').trim();
    if (!nombre) {
        return {
            clienteId: null,
            clienteNombreFinal: ''
        };
    }

    const nombreNormalizado = normalizarNombreCliente(nombre);
    const clienteExistente = await Client.findOne({ nombreNormalizado });

    if (clienteExistente) {
        clienteExistente.nombre = nombre;
        if (foto1) {
            clienteExistente.foto1 = foto1;
        }
        if (foto2) {
            clienteExistente.foto2 = foto2;
        }
        await clienteExistente.save();

        return {
            clienteId: clienteExistente._id,
            clienteNombreFinal: clienteExistente.nombre
        };
    }

    const nuevoCliente = await Client.create({
        nombre,
        nombreNormalizado,
        foto1: String(foto1 || ''),
        foto2: String(foto2 || '')
    });

    return {
        clienteId: nuevoCliente._id,
        clienteNombreFinal: nuevoCliente.nombre
    };
}

router.get('/', authRequired, async (req, res) => {
    const { fecha } = req.query;
    const filter = fecha ? { fecha } : {};

    const turnos = await Appointment.find(filter)
        .populate('peluquero', 'nombre telefono porcentajeComision agenda activo')
        .populate('clienteId', 'nombre telefono instagram fechaCumpleanos foto1 foto2 ultimaAtencion ultimaAtencionPeluquero')
        .populate('servicioId', 'nombre precio duracionMinutos')
        .sort({ fecha: 1, inicioMinutos: 1 });

    return res.json(turnos);
});

router.post('/', authRequired, async (req, res) => {
    const { fecha, hora, peluqueroId, cliente, clienteId, servicio, servicioId, foto1, foto2 } = req.body;

    if (!isValidDateString(fecha) || !hora || (!servicio && !servicioId)) {
        return res.status(400).json({ error: 'Fecha, hora y servicio son requeridos' });
    }

    let barber = null;
    if (peluqueroId) {
        barber = await Barber.findById(peluqueroId);
        if (!barber) {
            return res.status(404).json({ error: 'Peluquero no encontrado' });
        }
    }

    try {
        const clienteResuelto = await resolverCliente({
            clienteId,
            clienteNombre: cliente,
            foto1,
            foto2,
            fecha,
            peluqueroNombre: barber?.nombre || ''
        });

        const servicioResuelto = await resolverServicioTurno({
            servicioId,
            servicioLegacy: servicio
        });
        const duracionMinutos = servicioResuelto.duracionMinutos;
        const inicioMinutos = parseTimeToMinutes(hora);
        const finMinutos = inicioMinutos + duracionMinutos;

        validarHorarioGeneral(fecha, inicioMinutos, finMinutos);
        if (barber) {
            validarDisponibilidadEnAgenda(barber, fecha, inicioMinutos, finMinutos);

            await validarSuperposicion({
                peluqueroId,
                fecha,
                inicioMinutos,
                finMinutos
            });
        }

        const turno = await Appointment.create({
            fecha,
            horaInicio: hora,
            horaFin: minutesToTime(finMinutos),
            inicioMinutos,
            finMinutos,
            servicio: servicioResuelto.servicio,
            servicioId: servicioResuelto.servicioId,
            servicioNombre: servicioResuelto.servicioNombre,
            duracionMinutos,
            cliente: clienteResuelto.clienteNombreFinal,
            clienteId: clienteResuelto.clienteId,
            foto1: String(foto1 || ''),
            foto2: String(foto2 || ''),
            peluquero: peluqueroId || null,
            creadoPor: req.user.id
        });

        const turnoPopulado = await Appointment.findById(turno._id)
            .populate('peluquero', 'nombre telefono porcentajeComision agenda activo')
            .populate('clienteId', 'nombre telefono instagram fechaCumpleanos foto1 foto2 ultimaAtencion ultimaAtencionPeluquero')
            .populate('servicioId', 'nombre precio duracionMinutos');

        return res.status(201).json(turnoPopulado);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

router.put('/:id', authRequired, notAgendaRequired, async (req, res) => {
    const { fecha, hora, peluqueroId, cliente, clienteId, servicio, servicioId, foto1, foto2 } = req.body;

    if (!isValidDateString(fecha) || !hora || (!servicio && !servicioId)) {
        return res.status(400).json({ error: 'Fecha, hora y servicio son requeridos' });
    }

    let barber = null;
    if (peluqueroId) {
        barber = await Barber.findById(peluqueroId);
        if (!barber) {
            return res.status(404).json({ error: 'Peluquero no encontrado' });
        }
    }

    const turnoActual = await Appointment.findById(req.params.id);
    if (!turnoActual) {
        return res.status(404).json({ error: 'Turno no encontrado' });
    }

    try {
        const clienteResuelto = await resolverCliente({
            clienteId,
            clienteNombre: cliente,
            foto1,
            foto2,
            fecha,
            peluqueroNombre: barber?.nombre || ''
        });

        const servicioResuelto = await resolverServicioTurno({
            servicioId,
            servicioLegacy: servicio
        });
        const duracionMinutos = servicioResuelto.duracionMinutos;
        const inicioMinutos = parseTimeToMinutes(hora);
        const finMinutos = inicioMinutos + duracionMinutos;

        validarHorarioGeneral(fecha, inicioMinutos, finMinutos);
        if (barber) {
            validarDisponibilidadEnAgenda(barber, fecha, inicioMinutos, finMinutos);

            await validarSuperposicion({
                peluqueroId,
                fecha,
                inicioMinutos,
                finMinutos,
                turnoIdExcluir: req.params.id
            });
        }

        turnoActual.fecha = fecha;
        turnoActual.horaInicio = hora;
        turnoActual.horaFin = minutesToTime(finMinutos);
        turnoActual.inicioMinutos = inicioMinutos;
        turnoActual.finMinutos = finMinutos;
        turnoActual.servicio = servicioResuelto.servicio;
        turnoActual.servicioId = servicioResuelto.servicioId;
        turnoActual.servicioNombre = servicioResuelto.servicioNombre;
        turnoActual.duracionMinutos = duracionMinutos;
        turnoActual.cliente = clienteResuelto.clienteNombreFinal;
        turnoActual.clienteId = clienteResuelto.clienteId;
        turnoActual.foto1 = String(foto1 || '');
        turnoActual.foto2 = String(foto2 || '');
        turnoActual.peluquero = peluqueroId || null;

        await turnoActual.save();

        const turnoPopulado = await Appointment.findById(turnoActual._id)
            .populate('peluquero', 'nombre telefono porcentajeComision agenda activo')
            .populate('clienteId', 'nombre telefono instagram fechaCumpleanos foto1 foto2 ultimaAtencion ultimaAtencionPeluquero')
            .populate('servicioId', 'nombre precio duracionMinutos');

        return res.json(turnoPopulado);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

router.patch('/:id/estado', authRequired, async (req, res) => {
    const estado = normalizarEstadoTurno(req.body?.estado);

    if (!APPOINTMENT_STATUSES.has(estado)) {
        return res.status(400).json({ error: 'Estado de turno invalido' });
    }

    const turno = await Appointment.findById(req.params.id);
    if (!turno) {
        return res.status(404).json({ error: 'Turno no encontrado' });
    }

    turno.estado = estado;
    turno.estadoActualizadoEn = new Date();
    await turno.save();

    const turnoPopulado = await Appointment.findById(turno._id)
        .populate('peluquero', 'nombre telefono porcentajeComision agenda activo')
        .populate('clienteId', 'nombre telefono instagram fechaCumpleanos foto1 foto2 ultimaAtencion ultimaAtencionPeluquero')
        .populate('servicioId', 'nombre precio duracionMinutos');

    return res.json(turnoPopulado);
});

router.delete('/:id', authRequired, notAgendaRequired, async (req, res) => {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ error: 'Turno no encontrado' });
    }

    return res.json({ ok: true });
});

module.exports = router;
