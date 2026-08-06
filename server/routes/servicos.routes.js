// ============================================
// ROTAS DE SERVICOS
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// GET /api/servicos
// ============================================
router.get('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { ativo } = req.query;

    let sql = isProduction
        ? "SELECT * FROM servicos WHERE empresa_id = $1"
        : "SELECT * FROM servicos WHERE empresa_id = ?";
    let params = [empresaId];
    let counter = 2;

    // ✅ Filtrar apenas se o parâmetro ativo for passado
    if (ativo !== undefined && ativo !== '') {
        const ativoValue = ativo === 'true' || ativo === '1' ? 1 : 0;
        sql += isProduction ? ` AND (ativo = $${counter} OR ativo IS NULL)` : " AND (ativo = ? OR ativo IS NULL)";
        params.push(ativoValue);
        counter++;
    }

    sql += isProduction ? " ORDER BY nome" : " ORDER BY nome";

    db.all(sql, params, (err, servicos) => {
        if (err) {
            console.error("❌ Erro ao buscar servicos:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        console.log(`📋 ${servicos.length} serviços encontrados para empresa ${empresaId}`);

        res.json({
            success: true,
            data: servicos || []
        });
    });
});

// ============================================
// GET /api/servicos/todos
// ============================================
router.get('/todos', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "SELECT * FROM servicos WHERE empresa_id = $1 AND ativo = true ORDER BY nome"
        : "SELECT * FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome";

    db.all(sql, [empresaId], (err, servicos) => {
        if (err) {
            console.error("Erro ao buscar servicos:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: servicos || []
        });
    });
});

// ============================================
// POST /api/servicos - CORRIGIDO
// ============================================
router.post('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { nome, descricao, valor, duracao, ativo } = req.body;

    // ✅ Garantir que ativo seja 1 por padrão
    const ativoValue = ativo === true || ativo === 1 || ativo === 'true' || ativo === '1' ? 1 : 1; // <- SEMPRE 1

    const sql = isProduction
        ? `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
           VALUES ($1, $2, $3, $4, $5, $6)`
        : `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
           VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [nome, descricao || '', parseFloat(valor) || 0, parseInt(duracao) || 30, ativoValue, empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao criar serviço:', err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            message: 'Serviço criado com sucesso!',
            data: { id: this.lastID }
        });
    });
});

// ============================================
// PUT /api/servicos/:id
// ============================================
router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, descricao, valor, duracao, ativo } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!nome || !valor) {
        return res.status(400).json({
            success: false,
            message: 'Nome e valor sao obrigatorios'
        });
    }

    const sql = isProduction
        ? "UPDATE servicos SET nome = $1, descricao = $2, valor = $3, duracao = $4, ativo = $5 WHERE id = $6 AND empresa_id = $7"
        : "UPDATE servicos SET nome = ?, descricao = ?, valor = ?, duracao = ?, ativo = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [nome, descricao || '', parseFloat(valor), duracao || 30, ativo === false ? 0 : 1, id, empresaId], function (err) {
        if (err) {
            console.error("Erro ao atualizar servico:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Servico nao encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Servico atualizado com sucesso!'
        });
    });
});

// ============================================
// DELETE /api/servicos/:id
// ============================================
router.delete('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "DELETE FROM servicos WHERE id = $1 AND empresa_id = $2"
        : "DELETE FROM servicos WHERE id = ? AND empresa_id = ?";

    db.run(sql, [id, empresaId], function (err) {
        if (err) {
            console.error("Erro ao deletar servico:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Servico nao encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Servico deletado com sucesso!'
        });
    });
});

module.exports = router;
