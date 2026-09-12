const DEFAULT_SERVICE_WORK_TYPE = 'peluqueria';

const SERVICE_WORK_TYPES = [
    { value: 'peluqueria', label: 'Peluqueria' },
    { value: 'barberia', label: 'Barberia' },
    { value: 'manicura', label: 'Manicura' },
    { value: 'depilacion', label: 'Depilaci\u00f3n' }
];

const SERVICE_WORK_TYPE_VALUES = SERVICE_WORK_TYPES.map((item) => item.value);
const SERVICE_WORK_TYPE_LABELS = Object.fromEntries(
    SERVICE_WORK_TYPES.map((item) => [item.value, item.label])
);

function normalizeServiceWorkType(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return SERVICE_WORK_TYPE_VALUES.includes(normalized)
        ? normalized
        : DEFAULT_SERVICE_WORK_TYPE;
}

function isValidServiceWorkType(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return SERVICE_WORK_TYPE_VALUES.includes(normalized);
}

function getServiceWorkTypeLabel(value) {
    return SERVICE_WORK_TYPE_LABELS[normalizeServiceWorkType(value)] || SERVICE_WORK_TYPE_LABELS[DEFAULT_SERVICE_WORK_TYPE];
}

module.exports = {
    DEFAULT_SERVICE_WORK_TYPE,
    SERVICE_WORK_TYPES,
    SERVICE_WORK_TYPE_VALUES,
    SERVICE_WORK_TYPE_LABELS,
    normalizeServiceWorkType,
    isValidServiceWorkType,
    getServiceWorkTypeLabel
};
