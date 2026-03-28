const mongoose = require('mongoose');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

const appointmentSchema = new mongoose.Schema(
    {
        fecha: { type: String, required: true },
        horaInicio: { type: String, required: true },
        horaFin: { type: String, required: true },
        inicioMinutos: { type: Number, required: true },
        finMinutos: { type: Number, required: true },
        servicio: { type: String, required: true },
        servicioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
        servicioNombre: { type: String, default: '', trim: true, set: toUpperTrimmed },
        duracionMinutos: { type: Number, required: true },
        cliente: { type: String, default: '', trim: true, set: toUpperTrimmed },
        clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
        foto1: { type: String, default: '' },
        foto2: { type: String, default: '' },
        estado: { type: String, enum: ['pendiente', 'atendido', 'perdido'], default: 'pendiente' },
        estadoActualizadoEn: { type: Date, default: null },
        peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', default: null },
        creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    },
    {
        timestamps: true
    }
);

appointmentSchema.index({ peluquero: 1, fecha: 1, inicioMinutos: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
