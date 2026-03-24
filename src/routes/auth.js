const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authRequired, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    }

    const user = await User.findOne({ username: String(username).toLowerCase().trim() });

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
            role: user.role
        }
    });
});

router.get('/me', authRequired, async (req, res) => {
    const user = await User.findById(req.user.id).select('-passwordHash');

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(user);
});

router.post('/logout', (req, res) => {
    return res.json({ ok: true });
});

module.exports = router;
