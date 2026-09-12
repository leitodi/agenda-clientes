const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function parseTimeToMinutes(time) {
    if (!/^\d{2}:\d{2}$/.test(time)) {
        throw new Error('Hora invalida. Formato esperado HH:mm');
    }

    const [hourRaw, minuteRaw] = time.split(':').map(Number);

    if (
        Number.isNaN(hourRaw) ||
        Number.isNaN(minuteRaw) ||
        hourRaw < 0 ||
        hourRaw > 23 ||
        minuteRaw < 0 ||
        minuteRaw > 59
    ) {
        throw new Error('Hora invalida');
    }

    return (hourRaw * 60) + minuteRaw;
}

function minutesToTime(totalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getDayOfWeek(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        throw new Error('Fecha invalida. Formato esperado YYYY-MM-DD');
    }

    return date.getDay();
}

function getDayName(dayNumber) {
    return DAY_NAMES[dayNumber] || '';
}

module.exports = {
    DAY_NAMES,
    parseTimeToMinutes,
    minutesToTime,
    getDayOfWeek,
    getDayName
};
