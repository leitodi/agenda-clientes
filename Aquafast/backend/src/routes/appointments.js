const express = require('express');
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  const { date, start, end } = req.query;
  try {
    let filter = {};
    if (date) {
      const day = new Date(date);
      const tomorrow = new Date(day);
      tomorrow.setDate(day.getDate() + 1);
      filter.date = { $gte: day, $lt: tomorrow };
    }
    if (start && end) {
      filter.date = { $gte: new Date(start), $lte: new Date(end) };
    }

    const appointments = await Appointment.find(filter).populate('client').sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('client');
    if (!appointment) {
      return res.status(404).json({ message: 'Turno no encontrado' });
    }
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
