const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Barber = require('../models/Barber');

function scheduleRange(start, end, dayStart, dayEnd) {
    const items = [];
    for (let day = dayStart; day <= dayEnd; day += 1) {
        items.push({ dayOfWeek: day, start, end });
    }
    return items;
}

async function ensureSeedData() {
    const adminUsername = (process.env.ADMIN_USER || 'admin').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminExists = await User.findOne({ username: adminUsername });

    if (!adminExists) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await User.create({
            username: adminUsername,
            passwordHash,
            role: 'admin'
        });
        console.log(`Usuario admin creado: ${adminUsername}`);
    }

    const barbersCount = await Barber.countDocuments();
    if (barbersCount > 0) {
        return;
    }

    await Barber.insertMany([
        {
            nombre: 'Mauri',
            telefono: '',
            porcentajeComision: 40,
            agenda: scheduleRange('10:00', '22:00', 1, 6)
        },
        {
            nombre: 'Kevin',
            telefono: '',
            porcentajeComision: 40,
            agenda: scheduleRange('10:00', '22:00', 1, 6)
        },
        {
            nombre: 'Agus',
            telefono: '',
            porcentajeComision: 40,
            agenda: scheduleRange('10:00', '22:00', 1, 6)
        },
        {
            nombre: 'Juani',
            telefono: '',
            porcentajeComision: 40,
            agenda: scheduleRange('10:00', '22:00', 1, 6)
        },
        {
            nombre: 'Day',
            telefono: '',
            porcentajeComision: 40,
            agenda: scheduleRange('17:00', '22:00', 2, 6)
        }
    ]);

    console.log('Peluqueros iniciales creados');
}

module.exports = {
    ensureSeedData
};
