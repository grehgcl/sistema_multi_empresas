// ============================================
// ROTAS DE DESPESAS - VERSÃO SIMPLIFICADA
// ============================================

const express = require('express');
const router = express.Router();
const { getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

// ============================================
// GET /api/despesas - CORRIGIDO
// ============================================

router.get('/', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { mes, ano, categoria, search } = req.query;

        console.log(`📊 Buscando despesas - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}`);

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // 🔥 QUERY SEM FILTRO DE DATA (retorna TUDO)
        let sql = `SELECT * FROM despesas WHERE empresa_id = ?`;
        let params = [empresaId];

        // 🔥 SÓ FILTRAR POR DATA SE MES E ANO FOREM FORNECIDOS
        if (mes && ano && mes !== '' && ano !== '') {
            const mesFormatado = mes.padStart(2, '0');
            // Usar LIKE para comparar data (já que é TEXT)
            sql += ` AND data LIKE ? AND data LIKE ?`;
            params.push(`%${mesFormatado}%`);
            params.push(`%${ano}%`);
        }

        if (categoria && categoria !== '') {
            sql += ` AND categoria = ?`;
            params.push(categoria);
        }

        if (search && search !== '') {
            const searchTerm = `%${search}%`;
            sql += ` AND (descricao LIKE ? OR observacao LIKE ?)`;
            params.push(searchTerm, searchTerm);
        }

        sql += ` ORDER BY data DESC, id DESC`;

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        db.all(sql, params, (err, despesas) => {
            if (err) {
                console.error("❌ Erro ao buscar despesas:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            let totalGeral = 0;
            let totalPago = 0;
            let totalPendente = 0;

            for (const d of despesas) {
                const valor = parseFloat(d.valor) || 0;
                totalGeral += valor;
                if (d.pago === 1 || d.pago === true) {
                    totalPago += valor;
                } else {
                    totalPendente += valor;
                }
            }

            console.log(`✅ ${despesas.length} despesas encontradas`);

            res.json({
                success: true,
                data: despesas || [],
                totais: {
                    total: totalGeral,
                    pago: totalPago,
                    pendente: totalPendente
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// ============================================
// GET /api/despesas/resumo - CORRIGIDO
// ============================================

router.get('/resumo', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { mes, ano } = req.query;

        console.log(`📊 Resumo despesas - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}`);

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // 🔥 USAR MÊS/ANO ATUAL SE NÃO FORNECIDO
        const hoje = new Date();
        const mesAtual = mes || String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = ano || hoje.getFullYear();

        // 🔥 SEMPRE FILTRAR POR MÊS/ANO
        const sql = `
            SELECT 
                SUM(valor) as total,
                COUNT(*) as quantidade,
                COALESCE(categoria, 'Outras') as categoria
            FROM despesas 
            WHERE empresa_id = ? 
            AND data LIKE ?
            AND data LIKE ?
            GROUP BY categoria
            ORDER BY total DESC
        `;

        const params = [empresaId, `%${mesAtual}%`, `%${anoAtual}%`];

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        db.all(sql, params, (err, resumo) => {
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

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/despesas/categorias
// ============================================

router.get('/categorias', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const sql = `SELECT DISTINCT categoria FROM despesas WHERE empresa_id = ? AND categoria IS NOT NULL AND categoria != '' ORDER BY categoria`;

        db.all(sql, [empresaId], (err, categorias) => {
            if (err) {
                console.error("❌ Erro ao buscar categorias:", err);
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

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/despesas/:id
// ============================================

router.get('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        db.get(
            `SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`,
            [id, empresaId],
            (err, despesa) => {
                if (err) {
                    console.error("❌ Erro ao buscar despesa:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                if (!despesa) {
                    return res.status(404).json({
                        success: false,
                        message: 'Despesa não encontrada'
                    });
                }

                res.json({
                    success: true,
                    data: despesa
                });
            }
        );

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// POST /api/despesas
// ============================================

router.post('/', auth, verificarDono, (req, res) => {
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!descricao || !valor || !data) {
        return res.status(400).json({
            success: false,
            message: 'Descrição, valor e data são obrigatórios'
        });
    }

    const db = getEmpresaDb(empresaId);
    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `INSERT INTO despesas 
                 (empresa_id, descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        empresaId,
        descricao,
        categoria || 'Outras',
        parseFloat(valor),
        data,
        data_vencimento || null,
        pago ? 1 : 0,
        forma_pagamento || 'Dinheiro',
        observacao || ''
    ], function(err) {
        if (err) {
            console.error("❌ Erro ao criar despesa:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        const id = this.lastID;
        console.log(`✅ Despesa criada com ID: ${id}`);

        db.get(`SELECT * FROM despesas WHERE id = ?`, [id], (err, despesa) => {
            if (err) {
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

router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!descricao || !valor || !data) {
        return res.status(400).json({
            success: false,
            message: 'Descrição, valor e data são obrigatórios'
        });
    }

    const db = getEmpresaDb(empresaId);
    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `UPDATE despesas 
                 SET descricao = ?, categoria = ?, valor = ?, data = ?, 
                     data_vencimento = ?, pago = ?, forma_pagamento = ?, observacao = ?
                 WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [
        descricao,
        categoria || 'Outras',
        parseFloat(valor),
        data,
        data_vencimento || null,
        pago ? 1 : 0,
        forma_pagamento || 'Dinheiro',
        observacao || '',
        id,
        empresaId
    ], function(err) {
        if (err) {
            console.error("❌ Erro ao atualizar despesa:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Despesa não encontrada'
            });
        }

        db.get(`SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], (err, despesa) => {
            if (err) {
                return res.json({
                    success: true,
                    message: 'Despesa atualizada com sucesso!'
                });
            }

            res.json({
                success: true,
                message: 'Despesa atualizada com sucesso!',
                data: despesa
            });
        });
    });
});

// ============================================
// DELETE /api/despesas/:id
// ============================================

router.delete('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const db = getEmpresaDb(empresaId);
    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    db.get(`SELECT id FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], (err, row) => {
        if (err) {
            console.error("❌ Erro ao verificar despesa:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Despesa não encontrada'
            });
        }

        db.run(`DELETE FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], function(err) {
            if (err) {
                console.error("❌ Erro ao excluir despesa:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                message: 'Despesa excluída com sucesso!'
            });
        });
    });
});

module.exports = router;