require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agenda_clientes';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const clienteSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true },
        telefono: { type: String, required: true, trim: true },
        instagram: { type: String, default: '', trim: true },
        foto1: { type: String, required: true },
        foto2: { type: String, required: true }
    },
    {
        timestamps: { createdAt: 'fecha_creacion', updatedAt: false }
    }
);

const Cliente = mongoose.model('Cliente', clienteSchema);

function serializarCliente(cliente) {
    return {
        id: cliente._id.toString(),
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        instagram: cliente.instagram,
        foto1: cliente.foto1,
        foto2: cliente.foto2,
        fecha_creacion: cliente.fecha_creacion
    };
}

async function cargarDatosEjemplo() {
    const count = await Cliente.countDocuments();
    console.log(`Clientes en base de datos: ${count}`);

    if (count > 0) {
        console.log(`Base de datos ya contiene ${count} clientes`);
        return;
    }

    const ejemplos = [
        {
            nombre: 'Maria Gonzalez',
            telefono: '+34 612 345 678',
            instagram: 'maria.gonzalez',
            foto1: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%233498db" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3EMaria Gonzalez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 1%3C/tspan%3E%3C/text%3E%3C/svg%3E',
            foto2: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%239b59b6" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3EMaria Gonzalez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 2%3C/tspan%3E%3C/text%3E%3C/svg%3E'
        },
        {
            nombre: 'Juan Perez',
            telefono: '+34 698 765 432',
            instagram: 'juan.perez.style',
            foto1: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%2327ae60" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3EJuan Perez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 1%3C/tspan%3E%3C/text%3E%3C/svg%3E',
            foto2: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e74c3c" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3EJuan Perez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 2%3C/tspan%3E%3C/text%3E%3C/svg%3E'
        },
        {
            nombre: 'Ana Martinez',
            telefono: '+34 722 111 222',
            instagram: 'ana.martinez',
            foto1: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f39c12" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3EAna Martinez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 1%3C/tspan%3E%3C/text%3E%3C/svg%3E',
            foto2: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%231abc9c" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3EAna Martinez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 2%3C/tspan%3E%3C/text%3E%3C/svg%3E'
        },
        {
            nombre: 'Carlos Lopez',
            telefono: '+34 666 999 333',
            instagram: 'carlos.beauty',
            foto1: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%2334495e" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3ECarlos Lopez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 1%3C/tspan%3E%3C/text%3E%3C/svg%3E',
            foto2: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%232ecc71" width="400" height="400"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%" dy="0"%3ECarlos Lopez%3C/tspan%3E%3Ctspan x="50%" dy="30"%3EFoto 2%3C/tspan%3E%3C/text%3E%3C/svg%3E'
        }
    ];

    await Cliente.insertMany(ejemplos);
    console.log('Datos de ejemplo cargados correctamente');
}

// ============ RUTAS API ============

// GET - Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ fecha_creacion: -1 });
        res.json(clientes.map(serializarCliente));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET - Obtener cliente por ID
app.get('/api/clientes/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        res.json(serializarCliente(cliente));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Crear nuevo cliente
app.post('/api/clientes', async (req, res) => {
    const { nombre, telefono, instagram, foto1, foto2 } = req.body;

    if (!nombre || !telefono || !foto1 || !foto2) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
    }

    try {
        const nuevoCliente = await Cliente.create({
            nombre,
            telefono,
            instagram: instagram || '',
            foto1,
            foto2
        });
        res.json(serializarCliente(nuevoCliente));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT - Actualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
    const { nombre, telefono, instagram, foto1, foto2 } = req.body;

    try {
        const clienteActualizado = await Cliente.findByIdAndUpdate(
            req.params.id,
            { nombre, telefono, instagram, foto1, foto2 },
            { new: true, runValidators: true }
        );

        if (!clienteActualizado) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }

        res.json(serializarCliente(clienteActualizado));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Eliminar cliente
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const eliminado = await Cliente.findByIdAndDelete(req.params.id);
        if (!eliminado) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function iniciarServidor() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');
        await cargarDatosEjemplo();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
            console.log('Presiona Ctrl+C para detener el servidor');
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error.message);
        process.exit(1);
    }
}

iniciarServidor();
