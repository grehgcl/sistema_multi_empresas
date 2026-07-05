const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

function getFiltroAcesso(usuario) {
    if (usuario.ehSuperAdmin && usuario.ehSuperAdmin()) {
        return { sql: '', params: [] };
    }
    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return { sql: 'AND c.barbeiro_id = ?', params: [usuario.id] };
    }
    return { sql: 'AND c.empresa_id = ?', params: [usuario.empresa_id] };
}

router.get('/comissoes', auth, (req, res) => {
    const filtro = getFiltroAcesso(req.usuario);
    
    const query = `
        SELECT c.*,
               u.nome as barbeiro_nome,
               a.data as agendamento_data,
               cl.nome as cliente_nome,
               s.nome as servico_nome
        FROM comissoes c
        LEFT JOIN usuarios u ON c.barbeiro_id = u.id
        LEFT JOIN agendamentos a ON c.agendamento_id = a.id
        LEFT JOIN clientes cl ON a.cliente_id = cl.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE 1=1 ${filtro.sql}
        ORDER BY c.data DESC
    `;
    
    db.all(query, filtro.params, (err, comissoes) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: comissoes });
    });
});

router.get('/stats', auth, (req, res) => {
    const filtro = getFiltroAcesso(req.usuario);
    
    const query = `
        SELECT 
            COUNT(*) as total_comissoes,
            COALESCE(SUM(valor), 0) as total_valor,
            COUNT(DISTINCT barbeiro_id) as total_barbeiros
        FROM comissoes
        WHERE 1=1 ${filtro.sql}
    `;
    
    db.get(query, filtro.params, (err, stats) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: stats });
    });
});

module.exports = router;
