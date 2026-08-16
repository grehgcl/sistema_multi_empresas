const { getEmpresaDb } = require('../config/database');

function withEmpresaDb(req, res, next) {
    const empresaId = req.usuario?.empresa_id;

    if (!empresaId) {
        return res.status(401).json({
            success: false,
            message: 'Empresa não identificada'
        });
    }

    req.empresaDb = getEmpresaDb(empresaId);
    next();
}

module.exports = { withEmpresaDb };