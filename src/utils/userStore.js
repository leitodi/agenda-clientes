const mongoose = require('mongoose');
const User = require('../models/User');

const LEGACY_DB_NAME = 'agenda_clientes';

function normalizeUsername(value) {
    return String(value || '').toLowerCase().trim();
}

function getUserPayload(user, source = 'primary') {
    if (!user) {
        return null;
    }

    return {
        ...user.toObject(),
        _id: user._id,
        source
    };
}

async function getLegacyUserModel() {
    if (mongoose.connection.readyState !== 1) {
        return null;
    }

    const connection = mongoose.connection.useDb(LEGACY_DB_NAME, { useCache: true });
    return connection.models.User || connection.model('User', User.userSchema, 'users');
}

async function findUserByUsername(username) {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
        return null;
    }

    const legacyModel = await getLegacyUserModel();

    if (legacyModel) {
        const legacyUser = await legacyModel.findOne({ username: normalizedUsername });
        if (legacyUser) {
            return getUserPayload(legacyUser, 'legacy');
        }
    }

    const primaryUser = await User.findOne({ username: normalizedUsername });
    if (!primaryUser) {
        return null;
    }

    return getUserPayload(primaryUser, 'primary');
}

async function findUserById(id, preferredSource = 'legacy') {
    const sourceOrder = preferredSource === 'primary'
        ? ['primary', 'legacy']
        : ['legacy', 'primary'];

    for (const source of sourceOrder) {
        if (source === 'legacy') {
            const legacyModel = await getLegacyUserModel();
            if (!legacyModel) {
                continue;
            }

            const legacyUser = await legacyModel.findById(id);
            if (legacyUser) {
                return getUserPayload(legacyUser, 'legacy');
            }
            continue;
        }

        const primaryUser = await User.findById(id);
        if (primaryUser) {
            return getUserPayload(primaryUser, 'primary');
        }
    }

    return null;
}

async function listUsers() {
    const legacyModel = await getLegacyUserModel();
    if (legacyModel) {
        const legacyUsers = await legacyModel
            .find()
            .select('username role createdAt passwordVisible')
            .sort({ createdAt: -1 });

        return legacyUsers.map((user) => ({
            id: user._id.toString(),
            username: user.username,
            passwordVisible: user.passwordVisible,
            role: user.role,
            createdAt: user.createdAt,
            source: 'legacy'
        }));
    }

    const primaryUsers = await User.find()
        .select('username role createdAt passwordVisible')
        .sort({ createdAt: -1 });

    return primaryUsers.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
        createdAt: user.createdAt,
        source: 'primary'
    }));
}

async function createUser({ username, passwordHash, passwordVisible, role }) {
    const legacyModel = await getLegacyUserModel();
    const model = legacyModel || User;

    const user = await model.create({
        username: normalizeUsername(username),
        passwordHash,
        passwordVisible,
        role
    });

    return {
        id: user._id.toString(),
        username: user.username,
        passwordVisible: user.passwordVisible,
        role: user.role,
        createdAt: user.createdAt,
        source: legacyModel ? 'legacy' : 'primary'
    };
}

async function findUserForAdminById(id) {
    const legacyModel = await getLegacyUserModel();
    if (legacyModel) {
        const legacyUser = await legacyModel.findById(id);
        if (legacyUser) {
            return { user: legacyUser, source: 'legacy' };
        }
    }

    const primaryUser = await User.findById(id);
    if (primaryUser) {
        return { user: primaryUser, source: 'primary' };
    }

    return { user: null, source: null };
}

async function findUserByUsernameForAdmin(username, excludeId = null) {
    const normalizedUsername = normalizeUsername(username);
    const legacyModel = await getLegacyUserModel();
    const filter = excludeId
        ? { username: normalizedUsername, _id: { $ne: excludeId } }
        : { username: normalizedUsername };

    if (legacyModel) {
        return legacyModel.findOne(filter);
    }

    return User.findOne(filter);
}

async function countAdminsForSource(source) {
    if (source === 'legacy') {
        const legacyModel = await getLegacyUserModel();
        return legacyModel ? legacyModel.countDocuments({ role: 'admin' }) : 0;
    }

    return User.countDocuments({ role: 'admin' });
}

module.exports = {
    normalizeUsername,
    findUserByUsername,
    findUserById,
    listUsers,
    createUser,
    findUserForAdminById,
    findUserByUsernameForAdmin,
    countAdminsForSource
};
