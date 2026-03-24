const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        fecha: { type: String, required: true },
        horaInicio: { type: String, required: true },
        horaFin: { type: String, required: true },
        inicioMinutos: { type: Number, required: true },
        finMinutos: { type: Number, required: true },
        servicio: { type: String, enum: ['corte', 'corte_barba'], required: true },
        duracionMinutos: { type: Number, required: true },
        cliente: { type: String, default: '', trim: true },
        clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
        foto1: { type: String, default: '' },
        foto2: { type: String, default: '' },
        peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
        creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    },
    {
        timestamps: true
    }
);

appointmentSchema.index({ peluquero: 1, fecha: 1, inicioMinutos: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
