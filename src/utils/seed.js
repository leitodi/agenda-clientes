const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Barber = require('../models/Barber');
const Attendance = require('../models/Attendance');

function scheduleRange(start, end, dayStart, dayEnd) {
    const items = [];
    for (let day = dayStart; day <= dayEnd; day += 1) {
        items.push({ dayOfWeek: day, start, end });
    }
    return items;
}

function toDateString(date) {
    return date.toISOString().slice(0, 10);
}

function getLastWeekMonday() {
    const now = new Date();
    const currentMonday = new Date(now);
    const day = currentMonday.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    currentMonday.setDate(currentMonday.getDate() + diffToMonday);
    currentMonday.setDate(currentMonday.getDate() - 7);
    return currentMonday;
}

async function ensureSeedData() {
    const adminUsername = (process.env.ADMIN_USER || 'admin').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const agendaUsername = (process.env.AGENDA_USER || 'agenda').toLowerCase();
    const agendaPassword = process.env.AGENDA_PASSWORD || 'agenda123';

    const adminExists = await User.findOne({ username: adminUsername });

    if (!adminExists) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await User.create({
            username: adminUsername,
            passwordHash,
            passwordVisible: adminPassword,
            role: 'admin'
        });
        console.log(`Usuario admin creado: ${adminUsername}`);
    } else if (!adminExists.passwordVisible) {
        adminExists.passwordVisible = adminPassword;
        await adminExists.save();
    }

    const agendaExists = await User.findOne({ username: agendaUsername });

    if (!agendaExists) {
        const passwordHash = await bcrypt.hash(agendaPassword, 10);
        await User.create({
            username: agendaUsername,
            passwordHash,
            passwordVisible: agendaPassword,
            role: 'agenda'
        });
        console.log(`Usuario agenda creado: ${agendaUsername}`);
    } else if (!agendaExists.passwordVisible) {
        agendaExists.passwordVisible = agendaPassword;
        await agendaExists.save();
    }

    let barbers = await Barber.find().sort({ nombre: 1 });

    if (!barbers.length) {
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
        barbers = await Barber.find().sort({ nombre: 1 });
    }

    if (!barbers.length) {
        return;
    }

    const usuarioAdmin = await User.findOne({ username: adminUsername });
    if (!usuarioAdmin) {
        return;
    }

    const nombresClientes = [
        'Lucas', 'Mateo', 'Tobias', 'Santiago', 'Lautaro', 'Franco', 'Valentino', 'Bruno',
        'Thiago', 'Benjamin', 'Facundo', 'Nicolas', 'Joaquin', 'Gonzalo', 'Pablo', 'Enzo',
        'Ramiro', 'Nahuel', 'Agustin', 'Dylan', 'Ezequiel', 'Martin', 'Damian', 'Leandro'
    ];

    const apellidosClientes = [
        'Gomez', 'Perez', 'Sosa', 'Lopez', 'Fernandez', 'Alvarez', 'Romero', 'Torres',
        'Acosta', 'Suarez', 'Luna', 'Gutierrez', 'Diaz', 'Herrera', 'Molina', 'Rojas'
    ];

    const inicioSemana = getLastWeekMonday();
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 5);
    const inicioSemanaStr = toDateString(inicioSemana);
    const finSemanaStr = toDateString(finSemana);

    const alreadySeededWeek = await Attendance.countDocuments({
        fecha: { $gte: inicioSemanaStr, $lte: finSemanaStr }
    });

    if (alreadySeededWeek > 0) {
        return;
    }

    const datosFicticios = [];

    for (let dayOffset = 0; dayOffset < 6; dayOffset += 1) {
        const fecha = new Date(inicioSemana);
        fecha.setDate(inicioSemana.getDate() + dayOffset);
        const fechaStr = toDateString(fecha);

        for (let i = 0; i < 15; i += 1) {
            const barber = barbers[(dayOffset + i) % barbers.length];
            const nombre = nombresClientes[(dayOffset * 15 + i) % nombresClientes.length];
            const apellido = apellidosClientes[(dayOffset * 9 + i) % apellidosClientes.length];
            const cliente = `${nombre} ${apellido}`;
            const montoCobrado = 8000 + Math.floor(Math.random() * 14000);
            const comisionGanada = Number(((montoCobrado * barber.porcentajeComision) / 100).toFixed(2));
            const formaPago = ((dayOffset + i) % 3 === 0) ? 'transferencia' : 'efectivo';

            datosFicticios.push({
                fecha: fechaStr,
                cliente,
                formaPago,
                montoCobrado,
                comisionPorcentaje: barber.porcentajeComision,
                comisionGanada,
                peluquero: barber._id,
                registradoPor: usuarioAdmin._id
            });
        }
    }

    await Attendance.insertMany(datosFicticios);
    console.log(`Atenciones de ejemplo creadas: ${datosFicticios.length}`);
}

module.exports = {
    ensureSeedData
};
