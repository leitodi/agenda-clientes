const mongoose = require('mongoose');

const PRIMARY_DB_NAME = 'agenda_clientes';
const LEGACY_DB_NAME = 'agenda_peluqueria';
const DEFAULT_MONGODB_URI = `mongodb://127.0.0.1:27017/${PRIMARY_DB_NAME}`;

function normalizeDbName(dbName) {
    const normalized = String(dbName || '').trim();

    if (!normalized || normalized === LEGACY_DB_NAME) {
        return PRIMARY_DB_NAME;
    }

    return normalized;
}

function normalizeMongoUri(uri) {
    const normalized = String(uri || '').trim();

    if (!normalized) {
        return DEFAULT_MONGODB_URI;
    }

    return normalized.replace(
        /\/agenda_peluqueria(?=([/?]|$))/g,
        `/${PRIMARY_DB_NAME}`
    );
}

function getConfiguredMongoUri() {
    return normalizeMongoUri(process.env.MONGODB_URI || DEFAULT_MONGODB_URI);
}

function getActiveDbName() {
    return normalizeDbName(process.env.MONGODB_DB_NAME || PRIMARY_DB_NAME);
}

function getActiveDbConnection() {
    if (mongoose.connection.readyState !== 1) {
        return null;
    }

    const activeDbName = getActiveDbName();

    if (!activeDbName || mongoose.connection.name === activeDbName) {
        return mongoose.connection;
    }

    return mongoose.connection.useDb(activeDbName, { useCache: true });
}

module.exports = {
    PRIMARY_DB_NAME,
    LEGACY_DB_NAME,
    DEFAULT_MONGODB_URI,
    normalizeDbName,
    normalizeMongoUri,
    getConfiguredMongoUri,
    getActiveDbName,
    getActiveDbConnection
};
