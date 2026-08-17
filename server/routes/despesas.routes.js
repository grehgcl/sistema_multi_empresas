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

    let sql = isProduction
        ? "SELECT * FROM despesas WHERE empresa_id = $1"
        : "SELECT * FROM despesas WHERE empresa_id = ?";
    let params = [empresaId];
    let counter = 2;

    // 🔥 CORREÇÃO: Usar EXTRACT no PostgreSQL
    if (mes) {
        sql += isProduction
            ? ` AND EXTRACT(MONTH FROM data) = $${counter}`
            : " AND strftime('%m', data) = ?";
        params.push(mes);
        counter++;
    }

    if (ano) {
        sql += isProduction
            ? ` AND EXTRACT(YEAR FROM data) = $${counter}`
            : " AND strftime('%Y', data) = ?";
        params.push(ano);
        counter++;
    }

    if (categoria) {
        sql += isProduction
            ? ` AND categoria = $${counter}`
            : " AND categoria = ?";
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

    db.all(sql, params, (err, despesas) => {
        if (err) {
            console.error("❌ Erro ao buscar despesas:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: despesas || []
        });
    });
});

// Rota /resumo - Versão compatível com Turso
router.get('/resumo', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        
        // Buscar total de despesas
        const sql = `
            SELECT 
                COALESCE(SUM(valor), 0) as total,
                COALESCE(SUM(CASE WHEN pago = 1 THEN valor ELSE 0 END), 0) as pago,
                COALESCE(SUM(CASE WHEN pago = 0 OR pago IS NULL THEN valor ELSE 0 END), 0) as pendente
            FROM despesas 
            WHERE empresa_id = ?
        `;
        
        const result = await db.get(sql, [empresaId]);
        
        res.json({
            success: true,
            data: {
                total: result?.total || 0,
                pago: result?.pago || 0,
                pendente: result?.pendente || 0
            }
        });
    } catch (error) {
        console.error('❌ Erro no resumo de despesas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// server/routes/despesas.routes.js

// ============================================
// GET /api/despesas/resumo
// ============================================
router.get('/resumo', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { mes, ano } = req.query;

    // 🔥 CORREÇÃO: Usar EXTRACT no PostgreSQL e strftime no SQLite
    const sql = isProduction
        ? `SELECT 
            SUM(valor) as total,
            COUNT(*) as quantidade,
            categoria
           FROM despesas 
           WHERE empresa_id = $1 
           AND EXTRACT(MONTH FROM data) = $2
           AND EXTRACT(YEAR FROM data) = $3
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
            console.error("❌ Erro ao buscar resumo:", err);
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