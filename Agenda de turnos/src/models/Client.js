const mongoose = require('mongoose');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

const clientSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, set: toUpperTrimmed },
        nombreNormalizado: { type: String, required: true, trim: true, lowercase: true, index: true },
        telefono: { type: String, default: '', trim: true },
        telefonoNormalizado: { type: String, default: '', trim: true, index: true },
        instagram: { type: String, default: '', trim: true },
        fechaCumpleanos: { type: String, default: '' },
        foto1: { type: String, default: '' },
        foto2: { type: String, default: '' },
        ultimaAtencion: { type: String, default: '' },
        ultimaAtencionPeluquero: { type: String, default: '', set: toUpperTrimmed }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Client', clientSchema);
