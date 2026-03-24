const express = require('express');
const Attendance = require('../models/Attendance');
const { authRequired, notAgendaRequired } = require('../middleware/auth');
const XLSX = require('xlsx');

const router = express.Router();

function toDateString(date) {
    return date.toISOString().slice(0, 10);
}

function getWeekProgressRange(fechaBase) {
    const base = fechaBase ? new Date(`${fechaBase}T00:00:00`) : new Date();

    if (Number.isNaN(base.getTime())) {
        throw new Error('Fecha invalida para reporte');
    }

    const monday = new Date(base);
    const day = monday.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diffToMonday);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const endDate = new Date(base);
    if (endDate > saturday) {
        endDate.setTime(saturday.getTime());
    }

    return {
        desde: toDateString(monday),
        hasta: toDateString(endDate)
    };
}

function getWeekDates(desde, hasta) {
    const dates = [];
    const cursor = new Date(`${desde}T00:00:00`);
    const end = new Date(`${hasta}T00:00:00`);

    while (cursor <= end) {
        dates.push(toDateString(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

function getDayName(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    const names = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return names[date.getDay()] || '';
}

function validateDateRange(desde, hasta) {
    if (!desde || !hasta) {
        throw new Error('Debes indicar fecha desde y hasta');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(desde)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(hasta))) {
        throw new Error('Formato de fecha invalido. Usa YYYY-MM-DD');
    }

    const start = new Date(`${desde}T00:00:00`);
    const end = new Date(`${hasta}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Fechas invalidas');
    }

    if (start > end) {
        throw new Error('La fecha desde no puede ser mayor que la fecha hasta');
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (diffDays > 31) {
        throw new Error('El rango maximo permitido es 1 mes (31 dias)');
    }

    return { start, end, diffDays };
}

function agruparPorPeluquero(atenciones) {
    const grouped = new Map();

    atenciones.forEach((item) => {
        const barberId = item.peluquero?._id?.toString() || 'sin-peluquero';
        const barberName = item.peluquero?.nombre || 'Sin peluquero';

        if (!grouped.has(barberId)) {
            grouped.set(barberId, {
                peluqueroId: barberId,
                peluqueroNombre: barberName,
                totalCobrado: 0,
                totalComision: 0,
                registros: []
            });
        }

        const target = grouped.get(barberId);
        target.totalCobrado += item.montoCobrado;
        target.totalComision += item.comisionGanada;
        target.registros.push({
            fecha: item.fecha,
            cliente: item.cliente,
            montoCobrado: item.montoCobrado,
            comisionGanada: item.comisionGanada
        });
    });

    return Array.from(grouped.values()).map((group) => ({
        ...group,
        totalCobrado: Number(group.totalCobrado.toFixed(2)),
        totalComision: Number(group.totalComision.toFixed(2))
    }));
}

function agruparSemanaPorDiaYPeluquero(atenciones, desde, hasta) {
    const dates = getWeekDates(desde, hasta);
    const daysMap = new Map();

    dates.forEach((fecha) => {
        daysMap.set(fecha, {
            fecha,
            dia: getDayName(fecha),
            totalCobrado: 0,
            totalComision: 0,
            peluquerosMap: new Map()
        });
    });

    atenciones.forEach((item) => {
        const day = daysMap.get(item.fecha);
        if (!day) {
            return;
        }

        const barberId = item.peluquero?._id?.toString() || 'sin-peluquero';
        const barberName = item.peluquero?.nombre || 'Sin peluquero';

        if (!day.peluquerosMap.has(barberId)) {
            day.peluquerosMap.set(barberId, {
                peluqueroId: barberId,
                peluqueroNombre: barberName,
                cantidad: 0,
                totalCobrado: 0,
                totalComision: 0
            });
        }

        const target = day.peluquerosMap.get(barberId);
        target.cantidad += 1;
        target.totalCobrado += item.montoCobrado;
        target.totalComision += item.comisionGanada;

        day.totalCobrado += item.montoCobrado;
        day.totalComision += item.comisionGanada;
    });

    const dias = dates.map((fecha) => {
        const day = daysMap.get(fecha);
        const peluqueros = Array.from(day.peluquerosMap.values())
            .sort((a, b) => a.peluqueroNombre.localeCompare(b.peluqueroNombre))
            .map((item) => ({
                ...item,
                totalCobrado: Number(item.totalCobrado.toFixed(2)),
                totalComision: Number(item.totalComision.toFixed(2))
            }));

        return {
            fecha: day.fecha,
            dia: day.dia,
            totalCobrado: Number(day.totalCobrado.toFixed(2)),
            totalComision: Number(day.totalComision.toFixed(2)),
            peluqueros
        };
    });

    const totalSemana = dias.reduce((acc, day) => {
        acc.totalCobrado += day.totalCobrado;
        acc.totalComision += day.totalComision;
        return acc;
    }, { totalCobrado: 0, totalComision: 0 });

    return {
        desde,
        hasta,
        dias,
        totalCobrado: Number(totalSemana.totalCobrado.toFixed(2)),
        totalComision: Number(totalSemana.totalComision.toFixed(2))
    };
}

function agruparRangoPorDiaYPeluquero(atenciones) {
    const grouped = new Map();

    atenciones.forEach((item) => {
        const fecha = item.fecha;
        const barberId = item.peluquero?._id?.toString() || 'sin-peluquero';
        const barberName = item.peluquero?.nombre || 'Sin peluquero';
        const key = `${fecha}__${barberId}`;

        if (!grouped.has(key)) {
            grouped.set(key, {
                fecha,
                dia: getDayName(fecha),
                peluqueroId: barberId,
                peluqueroNombre: barberName,
                cantidad: 0,
                totalCobrado: 0,
                totalComision: 0
            });
        }

        const target = grouped.get(key);
        target.cantidad += 1;
        target.totalCobrado += Number(item.montoCobrado || 0);
        target.totalComision += Number(item.comisionGanada || 0);
    });

    return Array.from(grouped.values())
        .map((row) => ({
            ...row,
            totalCobrado: Number(row.totalCobrado.toFixed(2)),
            totalComision: Number(row.totalComision.toFixed(2))
        }))
        .sort((a, b) => {
            if (a.fecha !== b.fecha) {
                return a.fecha.localeCompare(b.fecha);
            }
            return a.peluqueroNombre.localeCompare(b.peluqueroNombre);
        });
}

router.get('/peluqueros', authRequired, notAgendaRequired, async (req, res) => {
    const { desde, hasta } = req.query;

    const filter = {};

    if (desde || hasta) {
        filter.fecha = {
            ...(desde ? { $gte: desde } : {}),
            ...(hasta ? { $lte: hasta } : {})
        };
    }

    const atenciones = await Attendance.find(filter)
        .populate('peluquero', 'nombre')
        .sort({ fecha: 1, createdAt: 1 });

    const response = agruparPorPeluquero(atenciones);

    return res.json(response);
});

router.get('/caja-semanal', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const fechaRef = req.query.fecha || req.query.sabado;
        const { desde, hasta } = getWeekProgressRange(fechaRef);

        const atenciones = await Attendance.find({
            fecha: { $gte: desde, $lte: hasta }
        })
            .populate('peluquero', 'nombre')
            .sort({ fecha: 1, createdAt: 1 });

        return res.json(agruparSemanaPorDiaYPeluquero(atenciones, desde, hasta));
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo generar reporte semanal' });
    }
});

router.get('/caja-rango', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        validateDateRange(desde, hasta);

        const atenciones = await Attendance.find({
            fecha: { $gte: desde, $lte: hasta }
        })
            .populate('peluquero', 'nombre')
            .sort({ fecha: 1, createdAt: 1 });

        const rows = agruparRangoPorDiaYPeluquero(atenciones);
        const totalCobrado = rows.reduce((acc, row) => acc + row.totalCobrado, 0);
        const totalComision = rows.reduce((acc, row) => acc + row.totalComision, 0);

        return res.json({
            desde,
            hasta,
            rows,
            totalCobrado: Number(totalCobrado.toFixed(2)),
            totalComision: Number(totalComision.toFixed(2))
        });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo generar reporte por rango' });
    }
});

router.get('/caja-rango-excel', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        validateDateRange(desde, hasta);

        const atenciones = await Attendance.find({
            fecha: { $gte: desde, $lte: hasta }
        })
            .populate('peluquero', 'nombre')
            .sort({ fecha: 1, createdAt: 1 });

        const rows = agruparRangoPorDiaYPeluquero(atenciones);
        const totalCobrado = rows.reduce((acc, row) => acc + row.totalCobrado, 0);
        const totalComision = rows.reduce((acc, row) => acc + row.totalComision, 0);

        const sheetRows = [
            ['Reporte por rango de caja'],
            [`Rango: ${desde} a ${hasta}`],
            [],
            ['Fecha', 'Dia', 'Peluquero', 'Atenciones', 'Monto total dia', 'Comision total dia']
        ];

        rows.forEach((row) => {
            sheetRows.push([
                row.fecha,
                row.dia,
                row.peluqueroNombre,
                row.cantidad,
                Number(row.totalCobrado.toFixed(2)),
                Number(row.totalComision.toFixed(2))
            ]);
        });

        sheetRows.push([]);
        sheetRows.push([
            'TOTAL GENERAL',
            '',
            '',
            rows.reduce((acc, row) => acc + row.cantidad, 0),
            Number(totalCobrado.toFixed(2)),
            Number(totalComision.toFixed(2))
        ]);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 12 },
            { wch: 22 },
            { wch: 12 },
            { wch: 16 },
            { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'RangoCaja');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `reporte_caja_${desde}_a_${hasta}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(buffer);
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo exportar el reporte por rango' });
    }
});

router.get('/caja-diario-excel', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const { fecha, peluqueroId } = req.query;
        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
            throw new Error('Fecha invalida para reporte diario');
        }

        const filter = { fecha };
        if (peluqueroId) {
            filter.peluquero = peluqueroId;
        }

        const atenciones = await Attendance.find(filter)
            .populate('peluquero', 'nombre')
            .sort({ createdAt: 1 });

        const grouped = new Map();
        atenciones.forEach((item) => {
            const barberId = item.peluquero?._id?.toString() || 'sin-peluquero';
            const barberName = item.peluquero?.nombre || 'Sin peluquero';

            if (!grouped.has(barberId)) {
                grouped.set(barberId, {
                    peluqueroNombre: barberName,
                    cantidad: 0,
                    totalCobrado: 0,
                    totalComision: 0
                });
            }

            const target = grouped.get(barberId);
            target.cantidad += 1;
            target.totalCobrado += Number(item.montoCobrado || 0);
            target.totalComision += Number(item.comisionGanada || 0);
        });

        const rowsByBarber = Array.from(grouped.values())
            .map((row) => ({
                ...row,
                totalCobrado: Number(row.totalCobrado.toFixed(2)),
                totalComision: Number(row.totalComision.toFixed(2))
            }))
            .sort((a, b) => a.peluqueroNombre.localeCompare(b.peluqueroNombre));

        const rows = [
            ['Resumen diario de caja por peluquero'],
            [`Fecha: ${fecha}`],
            [],
            ['Fecha', 'Peluquero', 'Atenciones', 'Monto total vendido', 'Comision total']
        ];

        rowsByBarber.forEach((row) => {
            rows.push([
                fecha,
                row.peluqueroNombre,
                row.cantidad,
                Number(row.totalCobrado.toFixed(2)),
                Number(row.totalComision.toFixed(2))
            ]);
        });

        const totalMonto = rowsByBarber.reduce((acc, row) => acc + row.totalCobrado, 0);
        const totalComision = rowsByBarber.reduce((acc, row) => acc + row.totalComision, 0);
        const totalAtenciones = rowsByBarber.reduce((acc, row) => acc + row.cantidad, 0);

        rows.push([]);
        rows.push(['TOTAL', '', totalAtenciones, Number(totalMonto.toFixed(2)), Number(totalComision.toFixed(2))]);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 24 },
            { wch: 12 },
            { wch: 18 },
            { wch: 16 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'CajaDiaria');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `reporte_caja_${fecha}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(buffer);
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo exportar el reporte diario' });
    }
});

router.get('/peluqueros/semanal-excel', authRequired, notAgendaRequired, async (req, res) => {
    try {
        const fechaRef = req.query.fecha || req.query.sabado;
        const { desde, hasta } = getWeekProgressRange(fechaRef);

        const atenciones = await Attendance.find({
            fecha: { $gte: desde, $lte: hasta }
        })
            .populate('peluquero', 'nombre')
            .sort({ fecha: 1, createdAt: 1 });

        const resumen = agruparPorPeluquero(atenciones);
        const semanalPorDia = agruparSemanaPorDiaYPeluquero(atenciones, desde, hasta);
        const totalFacturado = resumen.reduce((acc, item) => acc + item.totalCobrado, 0);
        const totalComision = resumen.reduce((acc, item) => acc + item.totalComision, 0);
        const totalNeto = totalFacturado - totalComision;

        const rows = [
            ['Resumen semanal caja'],
            [`Semana: ${desde} a ${hasta}`],
            [],
            ['Peluquero', 'Facturado', 'Comision', 'Neto salon']
        ];

        resumen.forEach((item) => {
            rows.push([
                item.peluqueroNombre,
                Number(item.totalCobrado.toFixed(2)),
                Number(item.totalComision.toFixed(2)),
                Number((item.totalCobrado - item.totalComision).toFixed(2))
            ]);
        });

        rows.push([]);
        rows.push([
            'TOTAL GENERAL',
            Number(totalFacturado.toFixed(2)),
            Number(totalComision.toFixed(2)),
            Number(totalNeto.toFixed(2))
        ]);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = [
            { wch: 22 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'ResumenSemanal');

        const rowsDetalle = [
            ['Detalle semanal por dia y peluquero'],
            [`Semana: ${desde} a ${hasta}`],
            [],
            ['Fecha', 'Dia', 'Peluquero', 'Atenciones', 'Facturado', 'Comision']
        ];

        semanalPorDia.dias.forEach((day) => {
            if (!day.peluqueros.length) {
                rowsDetalle.push([day.fecha, day.dia, '-', 0, 0, 0]);
                return;
            }

            day.peluqueros.forEach((item) => {
                rowsDetalle.push([
                    day.fecha,
                    day.dia,
                    item.peluqueroNombre,
                    item.cantidad,
                    Number(item.totalCobrado.toFixed(2)),
                    Number(item.totalComision.toFixed(2))
                ]);
            });
        });

        const sheetDetalle = XLSX.utils.aoa_to_sheet(rowsDetalle);
        sheetDetalle['!cols'] = [
            { wch: 12 },
            { wch: 12 },
            { wch: 22 },
            { wch: 12 },
            { wch: 14 },
            { wch: 14 }
        ];
        XLSX.utils.book_append_sheet(workbook, sheetDetalle, 'DetalleDia');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileName = `reporte_semanal_${desde}_a_${hasta}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(buffer);
    } catch (error) {
        return res.status(400).json({ error: error.message || 'No se pudo exportar el reporte semanal' });
    }
});

module.exports = router;
