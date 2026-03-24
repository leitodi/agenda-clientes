const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, adminRequired);

router.get('/', async (req, res) => {
    const users = await User.find().select('username role createdAt').sort({ createdAt: -1 });
    return res.json(users);
});

router.post('/', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    }

    const normalizedUsername = String(username).toLowerCase().trim();

    if (normalizedUsername.length < 3) {
        return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'La contrasena debe tener al menos 4 caracteres' });
    }

    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
        return res.status(409).json({ error: 'Ese usuario ya existe' });
    }

    const allowedRoles = new Set(['admin', 'user', 'agenda']);
    const finalRole = allowedRoles.has(role) ? role : 'user';

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
        username: normalizedUsername,
        passwordHash,
        role: finalRole
    });

    return res.status(201).json({
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
    });
});

module.exports = router;
