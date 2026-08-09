const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.usuario = decoded;
        console.log('✅ Usuário autenticado:', decoded.id, 'Empresa:', decoded.empresa_id);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
}

function verificarSuperAdmin(req, res, next) {
    const usuario = req.user || req.usuario;
    if (!usuario) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    const isSuperAdmin = usuario.role === 'super_admin' || usuario.role === 'superadmin' || usuario.role === 'SuperAdmin' || usuario.role === 'Super Admin';
    if (isSuperAdmin) return next();
    return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Super Admin pode realizar esta ação.' });
}

function verificarDono(req, res, next) {
    const usuario = req.user || req.usuario;
    if (!usuario) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    const isSuperAdmin = usuario.role === 'super_admin' || usuario.role === 'superadmin' || usuario.role === 'SuperAdmin';
    if (isSuperAdmin) return next();
    if (usuario.role === 'dono' || usuario.role === 'Dono') return next();
    return res.status(403).json({ success: false, message: 'Acesso negado. Apenas donos podem realizar esta ação.' });
}

function verificarLimiteProfissionais(req, res, next) { next(); }
function verificarAcessoAgendamentos(req, res, next) { next(); }
function verificarLimiteAgendamentos(req, res, next) { next(); }
function incrementarContadorAgendamentos(empresaId, callback) { if (callback) callback(null); }

module.exports = {
    auth,
    verificarSuperAdmin,
    verificarDono,
    verificarLimiteProfissionais,
    verificarAcessoAgendamentos,
    verificarLimiteAgendamentos,
    incrementarContadorAgendamentos
};
