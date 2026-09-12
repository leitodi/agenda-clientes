const SERVICE_TYPES = {
    corte: { label: 'Corte', durationMinutes: 30 },
    corte_barba: { label: 'Corte + barba', durationMinutes: 45 }
};

function getServiceDuration(serviceType) {
    const service = SERVICE_TYPES[serviceType];
    if (!service) {
        throw new Error('Tipo de servicio invalido');
    }
    return service.durationMinutes;
}

module.exports = {
    SERVICE_TYPES,
    getServiceDuration
};
