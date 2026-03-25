const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true },
        nombreNormalizado: { type: String, required: true, trim: true, lowercase: true, index: true },
        telefono: { type: String, default: '', trim: true },
        telefonoNormalizado: { type: String, default: '', trim: true, index: true },
        instagram: { type: String, default: '', trim: true },
        fechaCumpleanos: { type: String, default: '' },
        foto1: { type: String, default: '' },
        foto2: { type: String, default: '' },
        ultimaAtencion: { type: String, default: '' },
        ultimaAtencionPeluquero: { type: String, default: '' }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Client', clientSchema);
