const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, nombre y contraseña son requeridos' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = new User({ email, password: hashed, name });
    await user.save();

    res.status(201).json({ message: 'Usuario creado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const secret = process.env.JWT_SECRET || 'secret_local';
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, secret, {
      expiresIn: '8h',
    });

    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
