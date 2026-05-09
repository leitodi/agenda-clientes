const express = require('express');
const bcrypt = require('bcryptjs');
const Barber = require('../models/Barber');
const { authRequired, signToken } = require('../middleware/auth');
const { findUserByUsername, findUserById, normalizeUsername } = require('../utils/userStore');

const router = express.Router();

async function buildUserResponse(user) {
    const barberId = user?.barberId ? String(user.barberId) : '';
    const barber = barberId
        ? await Barber.findById(barberId).select('nombre')
        : null;

    return {
        id: user._id.toString(),
        _id: user._id,
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
        barberId,
        barberNombre: barber?.nombre || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        source: user.source || 'primary'
    };
}

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    }

    const user = await findUserByUsername(normalizeUsername(username));

    if (!user) {
        return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
        return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
    }

    const token = signToken(user);
    const userResponse = await buildUserResponse(user);

    return res.json({
        token,
        user: userResponse
    });
});

router.get('/me', authRequired, async (req, res) => {
    const user = await findUserById(req.user.id, req.user.source || 'legacy');

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(await buildUserResponse(user));
});

router.post('/logout', (req, res) => {
    return res.json({ ok: true });
});

module.exports = router;
