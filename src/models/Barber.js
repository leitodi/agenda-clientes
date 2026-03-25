const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
    {
        dayOfWeek: { type: Number, min: 0, max: 6, required: true },
        start: { type: String, required: true },
        end: { type: String, required: true }
    },
    { _id: false }
);

const barberSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true },
        telefono: { type: String, default: '', trim: true },
        fechaCumpleanos: { type: String, default: '' },
        porcentajeComision: { type: Number, required: true, min: 0, max: 100 },
        agenda: { type: [scheduleSchema], default: [] },
        activo: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Barber', barberSchema);
