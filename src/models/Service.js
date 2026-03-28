const mongoose = require('mongoose');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

const serviceSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, set: toUpperTrimmed },
        nombreNormalizado: { type: String, required: true, trim: true, lowercase: true, unique: true },
        precio: { type: Number, required: true, min: 0 },
        duracionMinutos: { type: Number, required: true, min: 1, default: 30 }
    },
    {
        timestamps: true
    }
);

serviceSchema.index({ nombreNormalizado: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
