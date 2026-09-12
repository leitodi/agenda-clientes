const mongoose = require('mongoose');

function toUpperTrimmed(value) {
    const text = String(value || '').trim();
    return text ? text.toUpperCase() : '';
}

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

const productSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, set: toUpperTrimmed },
        nombreNormalizado: { type: String, required: true, trim: true, lowercase: true, set: normalizeName },
        precio: { type: Number, required: true, min: 0 },
        comisionMonto: { type: Number, required: true, min: 0 }
    },
    {
        timestamps: true
    }
);

productSchema.index({ nombreNormalizado: 1 }, { unique: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
module.exports.productSchema = productSchema;
