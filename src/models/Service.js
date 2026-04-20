const mongoose = require('mongoose');
const {
    DEFAULT_SERVICE_WORK_TYPE,
    SERVICE_WORK_TYPE_VALUES,
    normalizeServiceWorkType
} = require('../utils/serviceWorkTypes');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

const serviceSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, set: toUpperTrimmed },
        nombreNormalizado: { type: String, required: true, trim: true, lowercase: true },
        tipoTrabajo: {
            type: String,
            required: true,
            enum: SERVICE_WORK_TYPE_VALUES,
            default: DEFAULT_SERVICE_WORK_TYPE,
            set: normalizeServiceWorkType
        },
        precio: { type: Number, required: true, min: 0 },
        duracionMinutos: { type: Number, required: true, min: 1, default: 30 }
    },
    {
        timestamps: true
    }
);

serviceSchema.index({ nombreNormalizado: 1, tipoTrabajo: 1 }, { unique: true });

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

module.exports = Service;
module.exports.serviceSchema = serviceSchema;
