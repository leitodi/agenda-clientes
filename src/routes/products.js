const express = require('express');
const { authRequired, adminRequired } = require('../middleware/auth');
const {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../utils/productStore');

const router = express.Router();

function parseAmount(value, label = 'Importe invalido') {
    const amount = Number(value);
    if (Number.isNaN(amount) || amount < 0) {
        throw new Error(label);
    }
    return Number(amount.toFixed(2));
}

router.get('/', authRequired, async (req, res) => {
    const products = await listProducts();
    return res.json(products);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
    try {
        const nombre = String(req.body?.nombre || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
        }

        const precio = parseAmount(req.body?.precio);
        const comisionMonto = parseAmount(req.body?.comisionMonto, 'La comision del producto es invalida');
        const product = await createProduct({ nombre, precio, comisionMonto });

        return res.status(201).json(product);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un producto con ese nombre' });
        }
        return res.status(400).json({ error: error.message || 'No se pudo crear el producto' });
    }
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
    try {
        const nombre = String(req.body?.nombre || '').trim();
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
        }

        const precio = parseAmount(req.body?.precio);
        const comisionMonto = parseAmount(req.body?.comisionMonto, 'La comision del producto es invalida');
        const product = await updateProduct(req.params.id, { nombre, precio, comisionMonto });

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        return res.json(product);
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ error: 'Ya existe un producto con ese nombre' });
        }
        return res.status(400).json({ error: error.message || 'No se pudo actualizar el producto' });
    }
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json({ ok: true });
});

module.exports = router;
