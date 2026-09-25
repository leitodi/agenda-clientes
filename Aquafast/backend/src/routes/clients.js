const express = require('express');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const normalizeImages = require('../utils/normalizeImages');

const router = express.Router();
router.use(auth);

const formatClient = (client) => ({
  ...(client.toObject ? client.toObject() : client),
  images: normalizeImages(client.images),
});

router.post('/', async (req, res) => {
  const { firstName, lastName, phone, email, notes, images } = req.body;
  try {
    const client = new Client({
      firstName,
      lastName,
      phone,
      email,
      notes,
      images: normalizeImages(images),
    });
    await client.save();
    res.status(201).json(formatClient(client));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const clients = await Client.find().sort({ firstName: 1, lastName: 1 });
    res.json(clients.map(formatClient));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(formatClient(client));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, notes, images } = req.body;
    const updateData = {
      firstName,
      lastName,
      phone,
      email,
      notes,
      images: normalizeImages(images),
    };

    const client = await Client.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(formatClient(client));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    if (!client.deletedAt) {
      client.deletedAt = new Date();
      await client.save();
    }

    res.json(formatClient(client));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
