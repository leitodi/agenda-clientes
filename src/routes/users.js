const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Barber = require('../models/Barber');
const { authRequired, adminRequired } = require('../middleware/auth');
const {
    normalizeUsername,
    listUsers,
    createUser,
    findUserForAdminById,
    findUserByUsernameForAdmin,
    countAdminsForSource
} = require('../utils/userStore');

const router = express.Router();

router.use(authRequired, adminRequired);

async function resolveBarberAssignment(barberId) {
    const value = String(barberId || '').trim();
    if (!value) {
        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Peluquero invalido');
    }

    const barber = await Barber.findById(value).select('_id nombre');
    if (!barber) {
        throw new Error('Peluquero no encontrado');
    }

    return barber;
}

async function enrichUsersWithBarber(users) {
    const barberIds = Array.from(new Set(
        users
            .map((user) => String(user.barberId || '').trim())
            .filter(Boolean)
    ));

    if (!barberIds.length) {
        return users.map((user) => ({
            ...user,
            barberNombre: ''
        }));
    }

    const barbers = await Barber.find({ _id: { $in: barberIds } }).select('nombre');
    const barbersById = new Map(barbers.map((barber) => [String(barber._id), barber.nombre]));

    return users.map((user) => ({
        ...user,
        barberNombre: barbersById.get(String(user.barberId || '')) || ''
    }));
}

router.get('/', async (req, res) => {
    const users = await listUsers();
    return res.json(await enrichUsersWithBarber(users));
});

router.post('/', async (req, res) => {
    const { username, password, role, barberId } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    }

    const normalizedUsername = normalizeUsername(username);

    if (normalizedUsername.length < 3) {
        return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres' });
    }

    const existing = await findUserByUsernameForAdmin(normalizedUsername);
    if (existing) {
        return res.status(409).json({ error: 'Ese usuario ya existe' });
    }

    const allowedRoles = new Set(['admin', 'user', 'agenda']);
    const finalRole = allowedRoles.has(role) ? role : 'user';
    const barber = await resolveBarberAssignment(barberId);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
        username: normalizedUsername,
        passwordHash,
        passwordVisible: password,
        role: finalRole,
        barberId: barber?._id || null
    });

    return res.status(201).json({
        ...user,
        barberNombre: barber?.nombre || ''
    });
});

router.put('/:id', async (req, res) => {
    const { username, role, password, barberId } = req.body;
    const { user, source } = await findUserForAdminById(req.params.id);

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (username !== undefined) {
        const normalizedUsername = normalizeUsername(username);

        if (normalizedUsername.length < 3) {
            return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
        }

        if (normalizedUsername !== user.username) {
            const existing = await findUserByUsernameForAdmin(normalizedUsername, user._id);
            if (existing) {
                return res.status(409).json({ error: 'Ese usuario ya existe' });
            }
            user.username = normalizedUsername;
        }
    }

    if (role !== undefined) {
        const allowedRoles = new Set(['admin', 'user', 'agenda']);
        if (!allowedRoles.has(role)) {
            return res.status(400).json({ error: 'Rol invalido' });
        }

        if (user.role === 'admin' && role !== 'admin') {
            const adminCount = await countAdminsForSource(source);
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Debe existir al menos un usuario admin' });
            }
        }

        user.role = role;
    }

    if (password !== undefined && String(password).trim() !== '') {
        if (String(password).length < 4) {
            return res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres' });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        user.passwordHash = passwordHash;
        user.passwordVisible = String(password);
    }

    if (barberId !== undefined) {
        const barber = await resolveBarberAssignment(barberId);
        user.barberId = barber?._id || null;
    }

    await user.save();

    const assignedBarber = user.barberId
        ? await Barber.findById(user.barberId).select('nombre')
        : null;

    return res.json({
        id: user._id.toString(),
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
        barberId: user.barberId ? String(user.barberId) : '',
        barberNombre: assignedBarber?.nombre || '',
        createdAt: user.createdAt,
        source
    });
});

router.put('/:id/password', async (req, res) => {
    const { password } = req.body;

    if (!password || String(password).length < 4) {
        return res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres' });
    }

    const { user, source } = await findUserForAdminById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.passwordVisible = String(password);
    await user.save();

    return res.json({
        id: user._id.toString(),
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
        barberId: user.barberId ? String(user.barberId) : '',
        createdAt: user.createdAt,
        source
    });
});

module.exports = router;
