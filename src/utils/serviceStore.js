const mongoose = require('mongoose');
const Service = require('../models/Service');
const { normalizeServiceWorkType } = require('./serviceWorkTypes');

const LEGACY_DB_NAME = 'agenda_clientes';

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function toServicePayload(service, source = 'primary') {
    if (!service) {
        return null;
    }

    const payload = service.toObject();

    return {
        ...payload,
        _id: service._id,
        tipoTrabajo: normalizeServiceWorkType(payload.tipoTrabajo),
        source
    };
}

async function getLegacyServiceModel() {
    if (mongoose.connection.readyState !== 1) {
        return null;
    }

    const connection = mongoose.connection.useDb(LEGACY_DB_NAME, { useCache: true });
    return connection.models.Service || connection.model('Service', Service.serviceSchema, 'services');
}

async function listServices() {
    const legacyModel = await getLegacyServiceModel();
    if (legacyModel) {
        const services = await legacyModel.find().sort({ tipoTrabajo: 1, nombre: 1 });
        return services.map((service) => toServicePayload(service, 'legacy'));
    }

    const services = await Service.find().sort({ tipoTrabajo: 1, nombre: 1 });
    return services.map((service) => toServicePayload(service, 'primary'));
}

async function findServiceById(id) {
    const serviceId = String(id || '').trim();
    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
        return null;
    }

    const legacyModel = await getLegacyServiceModel();
    if (legacyModel) {
        const legacyService = await legacyModel.findById(serviceId);
        if (legacyService) {
            return toServicePayload(legacyService, 'legacy');
        }
    }

    const primaryService = await Service.findById(serviceId);
    if (!primaryService) {
        return null;
    }

    return toServicePayload(primaryService, 'primary');
}

async function createService({ nombre, precio, duracionMinutos, tipoTrabajo }) {
    const payload = {
        nombre,
        nombreNormalizado: normalizeName(nombre),
        tipoTrabajo: normalizeServiceWorkType(tipoTrabajo),
        precio,
        duracionMinutos
    };

    const legacyModel = await getLegacyServiceModel();
    const model = legacyModel || Service;
    const service = await model.create(payload);

    return toServicePayload(service, legacyModel ? 'legacy' : 'primary');
}

async function updateService(id, { nombre, precio, duracionMinutos, tipoTrabajo }) {
    const serviceId = String(id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return null;
    }

    const legacyModel = await getLegacyServiceModel();
    const sourceOrder = legacyModel ? [
        { source: 'legacy', model: legacyModel },
        { source: 'primary', model: Service }
    ] : [
        { source: 'primary', model: Service }
    ];

    for (const entry of sourceOrder) {
        const service = await entry.model.findById(serviceId);
        if (!service) {
            continue;
        }

        service.nombre = nombre;
        service.nombreNormalizado = normalizeName(nombre);
        service.tipoTrabajo = normalizeServiceWorkType(tipoTrabajo);
        service.precio = precio;
        service.duracionMinutos = duracionMinutos;
        await service.save();

        return toServicePayload(service, entry.source);
    }

    return null;
}

async function deleteService(id) {
    const serviceId = String(id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return null;
    }

    const legacyModel = await getLegacyServiceModel();
    if (legacyModel) {
        const deletedLegacy = await legacyModel.findByIdAndDelete(serviceId);
        if (deletedLegacy) {
            return toServicePayload(deletedLegacy, 'legacy');
        }
    }

    const deletedPrimary = await Service.findByIdAndDelete(serviceId);
    return deletedPrimary ? toServicePayload(deletedPrimary, 'primary') : null;
}

module.exports = {
    listServices,
    findServiceById,
    createService,
    updateService,
    deleteService
};
