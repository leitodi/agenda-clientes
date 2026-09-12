const mongoose = require('mongoose');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

const attendanceSchema = new mongoose.Schema(
    {
        fecha: { type: String, required: true },
        cliente: { type: String, default: '', trim: true, set: toUpperTrimmed },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
        tipoVenta: { type: String, enum: ['servicio', 'producto'], default: 'servicio', required: true },
        servicioNombre: { type: String, default: '', trim: true, set: toUpperTrimmed },
        servicioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        productoNombre: { type: String, default: '', trim: true, set: toUpperTrimmed },
        productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        formaPago: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta'], default: 'efectivo', required: true },
        montoCobrado: { type: Number, required: true, min: 0 },
        comisionTipo: { type: String, enum: ['porcentaje', 'monto'], default: 'porcentaje', required: true },
        comisionPorcentaje: { type: Number, required: true, min: 0, max: 100, default: 0 },
        comisionGanada: { type: Number, required: true, min: 0 },
        peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
        registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    },
    {
        timestamps: true
    }
);

attendanceSchema.index({ fecha: 1, peluquero: 1 });
attendanceSchema.index({ clientId: 1, fecha: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
