const express = require('express');
const ExcelJS = require('exceljs');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const normalizeImages = require('../utils/normalizeImages');

const router = express.Router();
router.use(auth);

const formatPayment = (payment) => ({
  ...(payment.toObject ? payment.toObject() : payment),
  images: normalizeImages(payment.images),
});

router.post('/', async (req, res) => {
  try {
    const payment = new Payment({
      ...req.body,
      images: normalizeImages(req.body.images),
    });
    await payment.save();
    res.status(201).json(formatPayment(payment));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  const { start, end } = req.query;
  try {
    const filter = {};
    if (start && end) {
      filter.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    const payments = await Payment.find(filter).populate('client').sort({ date: 1 });
    res.json(payments.map(formatPayment));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/export', async (req, res) => {
  const { start, end } = req.query;
  try {
    if (!start || !end) {
      return res.status(400).json({ message: 'Rango de fechas requerido' });
    }
    const payments = await Payment.find({
      date: { $gte: new Date(start), $lte: new Date(end) },
    }).populate('client').sort({ date: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pagos');

    sheet.columns = [
      { header: 'Fecha', key: 'date', width: 18 },
      { header: 'Paciente', key: 'client', width: 30 },
      { header: 'Monto', key: 'amount', width: 14 },
      { header: 'Descripción', key: 'description', width: 30 },
    ];

    let total = 0;
    payments.forEach((payment) => {
      sheet.addRow({
        date: payment.date.toLocaleDateString('es-AR'),
        client: payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : 'Sin paciente',
        amount: payment.amount,
        description: payment.description || '',
      });
      total += payment.amount;
    });

    sheet.addRow({ client: 'Total', amount: total });
    sheet.getRow(sheet.rowCount).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=new-dent-pagos.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
