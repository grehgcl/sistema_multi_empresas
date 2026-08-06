// ============================================
// ROTAS DE DESPESAS
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// server/routes/despesas.routes.js

// ============================================
// GET /api/despesas
// ============================================
router.get('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { mes, ano, categoria, search } = req.query;

    console.log('📊 Buscando despesas - Empresa:', empresaId, 'Mês:', mes, 'Ano:', ano);

    let sql = isProduction
        ? "SELECT * FROM despesas WHERE empresa_id = $1"
        : "SELECT * FROM despesas WHERE empresa_id = ?";
    let params = [empresaId];
    let counter = 2;

    if (mes) {
        sql += isProduction ? ` AND strftime('%m', data) = $${counter}` : " AND strftime('%m', data) = ?";
        params.push(mes.padStart(2, '0'));
        counter++;
    }

    if (ano) {
        sql += isProduction ? ` AND strftime('%Y', data) = $${counter}` : " AND strftime('%Y', data) = ?";
        params.push(ano);
        counter++;
    }

    if (categoria) {
        sql += isProduction ? ` AND categoria = $${counter}` : " AND categoria = ?";
        params.push(categoria);
        counter++;
    }

    if (search) {
        const searchTerm = `%${search}%`;
        sql += isProduction
            ? ` AND (descricao LIKE $${counter} OR observacao LIKE $${counter + 1})`
            : " AND (descricao LIKE ? OR observacao LIKE ?)";
        params.push(searchTerm, searchTerm);
        counter += 2;
    }

    sql += isProduction ? " ORDER BY data DESC" : " ORDER BY data DESC";

    console.log('📊 SQL:', sql);
    console.log('📊 Params:', params);

    db.all(sql, params, (err, despesas) => {
        if (err) {
            console.error("❌ Erro ao buscar despesas:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        console.log(`📊 ${despesas.length} despesas encontradas para empresa ${empresaId}`);

        // 🔥 RETORNAR ARRAY DIRETO
        res.json({
            success: true,
            data: despesas || []
        });
    });
});

// ============================================
// GET /api/despesas/categorias
// ============================================
router.get('/categorias', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "SELECT DISTINCT categoria FROM despesas WHERE empresa_id = $1 ORDER BY categoria"
        : "SELECT DISTINCT categoria FROM despesas WHERE empresa_id = ? ORDER BY categoria";

    db.all(sql, [empresaId], (err, categorias) => {
        if (err) {
            console.error("Erro ao buscar categorias:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: categorias.map(c => c.categoria).filter(c => c)
        });
    });
});

// ============================================
// GET /api/despesas/resumo
// ============================================
router.get('/resumo', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { mes, ano } = req.query;

    const sql = isProduction
        ? `SELECT 
            SUM(valor) as total,
            COUNT(*) as quantidade,
            categoria
           FROM despesas 
           WHERE empresa_id = $1 
           AND strftime('%m', data) = $2 
           AND strftime('%Y', data) = $3
           GROUP BY categoria
           ORDER BY total DESC`
        : `SELECT 
            SUM(valor) as total,
            COUNT(*) as quantidade,
            categoria
           FROM despesas 
           WHERE empresa_id = ? 
           AND strftime('%m', data) = ? 
           AND strftime('%Y', data) = ?
           GROUP BY categoria
           ORDER BY total DESC`;

    db.all(sql, [empresaId, mes, ano], (err, resumo) => {
        if (err) {
            console.error("Erro ao buscar resumo:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        const total = resumo.reduce((acc, r) => acc + (r.total || 0), 0);

        res.json({
            success: true,
            data: {
                total: total,
                categorias: resumo || []
            }
        });
    });
});

// ============================================
// POST /api/despesas
// ============================================
// server/routes/despesas.routes.js - POST
router.post('/', auth, (req, res) => {
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!descricao || !valor || !data) {
        return res.status(400).json({
            success: false,
            message: 'Descricao, valor e data sao obrigatorios'
        });
    }

    const sql = isProduction
        ? `INSERT INTO despesas 
           (descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, empresa_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
        : `INSERT INTO despesas 
           (descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, empresa_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        descricao,
        categoria || 'Outras',
        parseFloat(valor),
        data,
        data_vencimento || data,
        pago ? 1 : 0,
        forma_pagamento || 'Dinheiro',
        observacao || '',
        empresaId
    ], function (err) {
        if (err) {
            console.error("❌ Erro ao criar despesa:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        const id = this.lastID;
        console.log(`✅ Despesa criada com ID: ${id}`);

        // 🔥 Buscar a despesa criada para retornar
        const sqlSelect = isProduction
            ? "SELECT * FROM despesas WHERE id = $1"
            : "SELECT * FROM despesas WHERE id = ?";

        db.get(sqlSelect, [id], (err, despesa) => {
            if (err) {
                console.error('❌ Erro ao buscar despesa:', err);
                return res.json({
                    success: true,
                    message: 'Despesa criada com sucesso!',
                    data: { id: id }
                });
            }

            res.json({
                success: true,
                message: 'Despesa criada com sucesso!',
                data: despesa
            });
        });
    });
});

// ============================================
// PUT /api/despesas/:id
// ============================================
router.put('/:id', auth, (req, res) => {
    const { id } = req.params;
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!descricao || !valor || !data) {
        return res.status(400).json({
            success: false,
            message: 'Descricao, valor e data sao obrigatorios'
        });
    }

    const sql = isProduction
        ? `UPDATE despesas 
           SET descricao = $1, categoria = $2, valor = $3, data = $4, 
               data_vencimento = $5, pago = $6, forma_pagamento = $7, observacao = $8
           WHERE id = $9 AND empresa_id = $10`
        : `UPDATE despesas 
           SET descricao = ?, categoria = ?, valor = ?, data = ?, 
               data_vencimento = ?, pago = ?, forma_pagamento = ?, observacao = ?
           WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [
        descricao,
        categoria || 'Outras',
        parseFloat(valor),
        data,
        data_vencimento || data,
        pago ? 1 : 0,
        forma_pagamento || 'Dinheiro',
        observacao || '',
        id,
        empresaId
    ], function (err) {
        if (err) {
            console.error("Erro ao atualizar despesa:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Despesa nao encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Despesa atualizada com sucesso!'
        });
    });
});

// ============================================
// DELETE /api/despesas/:id
// ============================================
router.delete('/:id', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "DELETE FROM despesas WHERE id = $1 AND empresa_id = $2"
        : "DELETE FROM despesas WHERE id = ? AND empresa_id = ?";

    db.run(sql, [id, empresaId], function (err) {
        if (err) {
            console.error("Erro ao deletar despesa:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Despesa nao encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Despesa deletada com sucesso!'
        });
    });
});

module.exports = router;