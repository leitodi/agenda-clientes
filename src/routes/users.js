const express = require('express');
const bcrypt = require('bcryptjs');
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

router.get('/', async (req, res) => {
    const users = await listUsers();
    return res.json(users);
});

router.post('/', async (req, res) => {
    const { username, password, role } = req.body;

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

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
        username: normalizedUsername,
        passwordHash,
        passwordVisible: password,
        role: finalRole
    });

    return res.status(201).json(user);
});

router.put('/:id', async (req, res) => {
    const { username, role, password } = req.body;
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

    await user.save();

    return res.json({
        id: user._id.toString(),
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
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
        createdAt: user.createdAt,
        source
    });
});

module.exports = router;
