const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-esta-clave-en-produccion';

function authRequired(req, res, next) {
    const authorization = req.headers.authorization || '';
    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Sesion invalida o expirada' });
    }
}

function adminRequired(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    return next();
}

function notAgendaRequired(req, res, next) {
    if (req.user?.role === 'agenda') {
        return res.status(403).json({ error: 'Este perfil solo puede gestionar agenda de turnos' });
    }
    return next();
}

function signToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );
}

module.exports = {
    authRequired,
    adminRequired,
    notAgendaRequired,
    signToken
};
