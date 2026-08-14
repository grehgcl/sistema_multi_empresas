const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

function verificarSuperAdmin(req, res, next) {
    if (!req.usuario.ehSuperAdmin || !req.usuario.ehSuperAdmin()) {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Super Admin.' });
    }
    next();
}

// Listar todas empresas
router.get('/empresas', auth, verificarSuperAdmin, (req, res) => {
    db.all(`
        SELECT e.*, 
               COUNT(DISTINCT u.id) as total_usuarios,
               COUNT(DISTINCT a.id) as total_agendamentos,
               COUNT(DISTINCT c.id) as total_clientes,
               COALESCE(SUM(cm.valor), 0) as total_comissoes
        FROM empresas e
        LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'barbeiro'
        LEFT JOIN agendamentos a ON a.empresa_id = e.id
        LEFT JOIN clientes c ON c.empresa_id = e.id
        LEFT JOIN comissoes cm ON cm.empresa_id = e.id
        GROUP BY e.id
        ORDER BY e.nome
    `, (err, empresas) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: empresas });
    });
});

// Criar empresa
router.post('/empresas', auth, verificarSuperAdmin, (req, res) => {
    const { nome, plano } = req.body;
    if (!nome) return res.json({ success: false, message: 'Nome da empresa é obrigatório' });
    
    db.run(`INSERT INTO empresas (nome, plano) VALUES (?, ?)`, [nome, plano || 'basico'], function(err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: { id: this.lastID }, message: 'Empresa criada com sucesso' });
    });
});

// Editar empresa
router.put('/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, plano } = req.body;
    
    db.run(`UPDATE empresas SET nome = COALESCE(?, nome), plano = COALESCE(?, plano) WHERE id = ?`,
        [nome, plano, id], function(err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: 'Empresa atualizada' });
        });
});

// Detalhes da empresa
router.get('/empresas/:id/detalhes', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    
    Promise.all([
        new Promise(resolve => db.get(`SELECT * FROM empresas WHERE id = ?`, [id], (e, r) => resolve(r))),
        new Promise(resolve => db.all(`SELECT id, nome, email, comissao_percentual FROM usuarios WHERE empresa_id = ? AND role = 'barbeiro'`, [id], (e, r) => resolve(r))),
        new Promise(resolve => db.all(`SELECT id, nome, telefone, email FROM clientes WHERE empresa_id = ?`, [id], (e, r) => resolve(r))),
        new Promise(resolve => db.all(`SELECT id, data, status, valor_total FROM agendamentos WHERE empresa_id = ?`, [id], (e, r) => resolve(r)))
    ]).then(([empresa, profissionais, clientes, agendamentos]) => {
        const faturamento = agendamentos.filter(a => a.status === 'concluido').reduce((s,a) => s + (a.valor_total || 0), 0);
        res.json({ success: true, data: { empresa, profissionais, clientes, agendamentos, faturamento } });
    });
});

// Criar dono
router.post('/criar-dono', auth, verificarSuperAdmin, (req, res) => {
    const { empresa_id, nome, email, senha } = req.body;
    if (!empresa_id || !nome || !email || !senha) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios' });
    }
    
    const senhaHash = bcrypt.hashSync(senha, 10);
    db.run(`INSERT INTO usuarios (nome, email, senha, role, nivel, empresa_id) VALUES (?, ?, ?, 'admin', 2, ?)`,
        [nome, email, senhaHash, empresa_id], function(err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: `Dono ${nome} criado com sucesso!` });
        });
});

// Criar profissional
router.post('/profissionais', auth, (req, res) => {
    const { nome, email, senha, comissao_percentual, empresa_id } = req.body;
    
    let empresaDestino = empresa_id;
    if (req.usuario.ehDono && req.usuario.ehDono()) {
        empresaDestino = req.usuario.empresa_id;
    } else if (!req.usuario.ehSuperAdmin()) {
        return res.json({ success: false, message: 'Sem permissão' });
    }
    
    if (!nome || !email || !senha) {
        return res.json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }
    
    const senhaHash = bcrypt.hashSync(senha, 10);
    db.run(`INSERT INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
            VALUES (?, ?, ?, 'barbeiro', 1, ?, ?, 1)`,
        [nome, email, senhaHash, empresaDestino, comissao_percentual || 30], function(err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: `Profissional ${nome} criado com sucesso!` });
        });
});

// Excluir profissional
router.delete('/profissionais/:id', auth, (req, res) => {
    const { id } = req.params;
    
    db.run(`DELETE FROM usuarios WHERE id = ? AND role = 'barbeiro'`, [id], function(err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: 'Profissional excluído' });
    });
});

// Estatísticas completas
router.get('/estatisticas-completas', auth, verificarSuperAdmin, (req, res) => {
    Promise.all([
        new Promise(resolve => db.get("SELECT COUNT(*) as total FROM empresas", (e, r) => resolve(r))),
        new Promise(resolve => db.get("SELECT COUNT(*) as total FROM usuarios WHERE role = 'barbeiro'", (e, r) => resolve(r))),
        new Promise(resolve => db.get("SELECT COUNT(*) as total FROM agendamentos", (e, r) => resolve(r))),
        new Promise(resolve => db.get("SELECT COALESCE(SUM(valor), 0) as total FROM comissoes", (e, r) => resolve(r)))
    ]).then(([empresas, usuarios, agendamentos, comissoes]) => {
        res.json({ success: true, data: {
            empresas: empresas?.total || 0,
            usuarios: usuarios?.total || 0,
            agendamentos: agendamentos?.total || 0,
            comissoes: comissoes?.total || 0
        } });
    });
});

module.exports = router;
