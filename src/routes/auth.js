const express = require('express');
const bcrypt = require('bcryptjs');
const { authRequired, signToken } = require('../middleware/auth');
const { findUserByUsername, findUserById, normalizeUsername } = require('../utils/userStore');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    }

    const user = await findUserByUsername(normalizeUsername(username));

    if (!user) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = signToken(user);

    return res.json({
        token,
        user: {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            source: user.source || 'primary'
        }
    });
});

router.get('/me', authRequired, async (req, res) => {
    const user = await findUserById(req.user.id, req.user.source || 'legacy');

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
        _id: user._id,
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        source: user.source || 'primary'
    });
});

router.post('/logout', (req, res) => {
    return res.json({ ok: true });
});

module.exports = router;
