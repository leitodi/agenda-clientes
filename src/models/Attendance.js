const mongoose = require('mongoose');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

const attendanceSchema = new mongoose.Schema(
    {
        fecha: { type: String, required: true },
        cliente: { type: String, default: '', trim: true, set: toUpperTrimmed },
        servicioNombre: { type: String, default: '', trim: true, set: toUpperTrimmed },
        servicioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        formaPago: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta'], default: 'efectivo', required: true },
        montoCobrado: { type: Number, required: true, min: 0 },
        comisionPorcentaje: { type: Number, required: true, min: 0, max: 100 },
        comisionGanada: { type: Number, required: true, min: 0 },
        peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
        registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    },
    {
        timestamps: true
    }
);

attendanceSchema.index({ fecha: 1, peluquero: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
