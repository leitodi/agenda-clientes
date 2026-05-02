const mongoose = require('mongoose');
const Product = require('../models/Product');

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function toProductPayload(product) {
    if (!product) {
        return null;
    }

    const payload = product.toObject();

    return {
        ...payload,
        _id: product._id
    };
}

async function listProducts() {
    const products = await Product.find().sort({ nombre: 1 });
    return products.map((product) => toProductPayload(product));
}

async function findProductById(id) {
    const productId = String(id || '').trim();
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return null;
    }

    const product = await Product.findById(productId);
    return toProductPayload(product);
}

async function createProduct({ nombre, precio, comisionMonto }) {
    const product = await Product.create({
        nombre,
        nombreNormalizado: normalizeName(nombre),
        precio,
        comisionMonto
    });

    return toProductPayload(product);
}

async function updateProduct(id, { nombre, precio, comisionMonto }) {
    const productId = String(id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return null;
    }

    const product = await Product.findById(productId);
    if (!product) {
        return null;
    }

    product.nombre = nombre;
    product.nombreNormalizado = normalizeName(nombre);
    product.precio = precio;
    product.comisionMonto = comisionMonto;
    await product.save();

    return toProductPayload(product);
}

async function deleteProduct(id) {
    const productId = String(id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return null;
    }

    const product = await Product.findByIdAndDelete(productId);
    return toProductPayload(product);
}

module.exports = {
    listProducts,
    findProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
