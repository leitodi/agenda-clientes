const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true },
        nombreNormalizado: { type: String, required: true, unique: true, trim: true, lowercase: true },
        dni: { type: String, default: '', trim: true, index: true },
        telefono: { type: String, default: '', trim: true },
        instagram: { type: String, default: '', trim: true },
        foto1: { type: String, default: '' },
        foto2: { type: String, default: '' },
        ultimaAtencion: { type: String, default: '' }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Client', clientSchema);
