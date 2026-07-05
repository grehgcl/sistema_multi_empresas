const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// ============================================
// FUNÇÃO AUXILIAR - FILTRO DE ACESSO
// ============================================

function getFiltroAcesso(usuario) {
    if (usuario.ehSuperAdmin && usuario.ehSuperAdmin()) {
        return { sql: '', params: [] };
    }
    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return { sql: 'AND a.profissional_id = ?', params: [usuario.id] };
    }
    return { sql: 'AND a.empresa_id = ?', params: [usuario.empresa_id] };
}

// ============================================
// GET /api/financeiro - DADOS FINANCEIROS COMPLETOS
// ============================================

router.get('/', auth, (req, res) => {
    const usuario = req.usuario;
    const filtro = getFiltroAcesso(usuario);
    const isDono = usuario.role === 'dono' || usuario.ehSuperAdmin?.();
    const empresaId = usuario.empresa_id;

    // 1. BUSCAR SERVIÇOS CONCLUÍDOS COM COMISSÕES
    let comissoesSql = `
        SELECT 
            a.id,
            a.data,
            a.valor,
            a.servico,
            a.status,
            a.comissao,
            a.profissional_id,
            c.nome as cliente_nome,
            s.nome as servico_nome,
            p.nome as profissional_nome,
            p.comissao_percent
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        LEFT JOIN profissionais p ON a.profissional_id = p.id
        WHERE a.status = 'concluido'
        ${filtro.sql}
        ORDER BY a.data DESC
    `;

    db.all(comissoesSql, filtro.params, (err, comissoes) => {
        if (err) {
            console.error('Erro ao buscar comissões:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        // 2. CALCULAR TOTAIS DE RECEITAS
        const totalFaturamentoBruto = comissoes.reduce((acc, a) => acc + (a.valor || 0), 0);
        const totalComissoes = comissoes
            .filter(a => a.profissional_id)
            .reduce((acc, a) => acc + (a.comissao || 0), 0);
        const totalServicos = comissoes.length;

        // 3. BUSCAR DESPESAS DO MÊS ATUAL
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = String(hoje.getFullYear());

        let despesasSql = `
            SELECT 
                COALESCE(SUM(CASE WHEN pago = 1 THEN valor ELSE 0 END), 0) as total_pago,
                COALESCE(SUM(CASE WHEN pago = 0 THEN valor ELSE 0 END), 0) as total_pendente,
                COALESCE(SUM(valor), 0) as total_despesas,
                COUNT(*) as total_quantidade
            FROM despesas
            WHERE empresa_id = ?
            AND strftime('%m', data) = ?
            AND strftime('%Y', data) = ?
        `;

        db.get(despesasSql, [empresaId, mes, ano], (err, despesas) => {
            if (err) {
                console.error('Erro ao buscar despesas:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            // 4. BUSCAR DESPESAS POR CATEGORIA
            const catSql = `
                SELECT categoria, COUNT(*) as total, SUM(valor) as total_valor
                FROM despesas
                WHERE empresa_id = ?
                AND strftime('%m', data) = ?
                AND strftime('%Y', data) = ?
                GROUP BY categoria
                ORDER BY total_valor DESC
            `;

            db.all(catSql, [empresaId, mes, ano], (err, categorias) => {
                if (err) {
                    console.error('Erro ao buscar categorias:', err);
                    return res.status(500).json({ success: false, message: err.message });
                }

                // 5. BUSCAR COMISSÕES POR PROFISSIONAL (apenas para dono)
                let comissoesProfSql = '';
                let comissoesProfParams = [];

                if (isDono) {
                    comissoesProfSql = `
                        SELECT 
                            p.id,
                            p.nome,
                            COUNT(a.id) as total_servicos,
                            COALESCE(SUM(a.comissao), 0) as total_comissao
                        FROM agendamentos a
                        LEFT JOIN profissionais p ON a.profissional_id = p.id
                        WHERE a.status = 'concluido'
                        AND a.profissional_id IS NOT NULL
                        AND a.empresa_id = ?
                        GROUP BY p.id, p.nome
                        ORDER BY total_comissao DESC
                    `;
                    comissoesProfParams = [empresaId];
                }

                db.all(comissoesProfSql, comissoesProfParams, (err, comissoesPorProfissional) => {
                    if (err) {
                        console.error('Erro ao buscar comissões por profissional:', err);
                        return res.status(500).json({ success: false, message: err.message });
                    }

                    // 6. MONTAR RESPOSTA COMPLETA
                    const totalDespesas = despesas?.total_despesas || 0;
                    const totalPago = despesas?.total_pago || 0;
                    const totalPendente = despesas?.total_pendente || 0;

                    res.json({
                        success: true,
                        data: {
                            // RECEITAS
                            totais: {
                                faturamento_bruto: totalFaturamentoBruto,
                                total_comissoes: totalComissoes,
                                faturamento_liquido: totalFaturamentoBruto - totalComissoes,
                                total_servicos: totalServicos
                            },

                            // DESPESAS
                            despesas: {
                                total: totalDespesas,
                                pago: totalPago,
                                pendente: totalPendente,
                                quantidade: despesas?.total_quantidade || 0,
                                por_categoria: categorias || []
                            },

                            // LUCRO
                            lucro: {
                                bruto: totalFaturamentoBruto,
                                liquido: (totalFaturamentoBruto - totalComissoes) - totalDespesas,
                                apos_comissoes: totalFaturamentoBruto - totalComissoes,
                                apos_despesas: totalFaturamentoBruto - totalDespesas,
                                margem: totalFaturamentoBruto > 0
                                    ? (((totalFaturamentoBruto - totalComissoes - totalDespesas) / totalFaturamentoBruto) * 100).toFixed(1)
                                    : 0
                            },

                            // LISTAS
                            comissoes: comissoes,
                            comissoes_por_profissional: comissoesPorProfissional || [],
                            despesas_lista: [] // Será carregado em outra rota se necessário
                        }
                    });
                });
            });
        });
    });
});

// ============================================
// GET /api/financeiro/despesas - LISTAR DESPESAS COM FILTROS
// ============================================

router.get('/despesas', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return res.json({
            success: true,
            data: {
                despesas: [],
                totais: { total: 0, pago: 0, pendente: 0, quantidade: 0 }
            }
        });
    }

    const empresaId = usuario.empresa_id;
    const { mes, ano, categoria, pago } = req.query;
    let params = [empresaId];
    let sql = `
        SELECT d.*
        FROM despesas d
        WHERE d.empresa_id = ?
    `;

    if (mes && ano) {
        sql += ` AND strftime('%m', d.data) = ? AND strftime('%Y', d.data) = ?`;
        params.push(mes.padStart(2, '0'), ano);
    }

    if (categoria) {
        sql += ` AND d.categoria = ?`;
        params.push(categoria);
    }

    if (pago !== undefined && pago !== '') {
        const pagoBool = pago === 'true' ? 1 : 0;
        sql += ` AND d.pago = ?`;
        params.push(pagoBool);
    }

    sql += ` ORDER BY d.data DESC, d.created_at DESC`;

    db.all(sql, params, (err, despesas) => {
        if (err) {
            console.error('Erro ao buscar despesas:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        // Calcular totais
        const totalDespesas = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);
        const totalPago = despesas.filter(d => d.pago).reduce((acc, d) => acc + (d.valor || 0), 0);
        const totalPendente = despesas.filter(d => !d.pago).reduce((acc, d) => acc + (d.valor || 0), 0);

        res.json({
            success: true,
            data: {
                despesas: despesas,
                totais: {
                    total: totalDespesas,
                    pago: totalPago,
                    pendente: totalPendente,
                    quantidade: despesas.length
                }
            }
        });
    });
});

// ============================================
// GET /api/financeiro/categorias - LISTAR CATEGORIAS
// ============================================

router.get('/categorias', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return res.json({ success: true, data: [] });
    }

    const empresaId = usuario.empresa_id;

    const defaultCategorias = [
        'Aluguel', 'Água', 'Energia Elétrica', 'Internet', 'Telefone',
        'Material de Consumo', 'Equipamentos', 'Manutenção', 'Impostos',
        'Salários', 'Comissões', 'Marketing', 'Limpeza', 'Alimentação',
        'Transporte', 'Outros'
    ];

    db.all(
        `SELECT DISTINCT categoria FROM despesas WHERE empresa_id = ? ORDER BY categoria`,
        [empresaId],
        (err, categorias) => {
            if (err) {
                console.error('Erro ao buscar categorias:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            const categoriasExistentes = categorias.map(c => c.categoria);
            const todasCategorias = [...new Set([...defaultCategorias, ...categoriasExistentes])].sort();

            res.json({ success: true, data: todasCategorias });
        }
    );
});

// ============================================
// POST /api/financeiro/despesas - CRIAR DESPESA
// ============================================

router.post('/despesas', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return res.status(403).json({
            success: false,
            message: 'Profissionais não podem criar despesas'
        });
    }

    const empresaId = usuario.empresa_id;
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;

    if (!descricao || !categoria || !valor || !data) {
        return res.status(400).json({
            success: false,
            message: 'Descrição, categoria, valor e data são obrigatórios'
        });
    }

    if (valor <= 0) {
        return res.status(400).json({
            success: false,
            message: 'O valor deve ser maior que zero'
        });
    }

    const sql = `
        INSERT INTO despesas (
            empresa_id, descricao, categoria, valor, data,
            data_vencimento, pago, forma_pagamento, observacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        empresaId,
        descricao.trim(),
        categoria.trim(),
        valor,
        data,
        data_vencimento || null,
        pago ? 1 : 0,
        forma_pagamento || null,
        observacao || null
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Erro ao criar despesa:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        db.get(`SELECT * FROM despesas WHERE id = ?`, [this.lastID], (err, despesa) => {
            if (err) {
                console.error('Erro ao buscar despesa:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                data: despesa,
                message: 'Despesa criada com sucesso!'
            });
        });
    });
});

// ============================================
// PUT /api/financeiro/despesas/:id - ATUALIZAR DESPESA
// ============================================

router.put('/despesas/:id', auth, (req, res) => {
    const usuario = req.usuario;
    const { id } = req.params;

    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return res.status(403).json({
            success: false,
            message: 'Profissionais não podem editar despesas'
        });
    }

    const empresaId = usuario.empresa_id;
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;

    db.get(`SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], (err, existing) => {
        if (err) {
            console.error('Erro ao verificar despesa:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
        }

        if (!descricao || !categoria || !valor || !data) {
            return res.status(400).json({
                success: false,
                message: 'Descrição, categoria, valor e data são obrigatórios'
            });
        }

        if (valor <= 0) {
            return res.status(400).json({
                success: false,
                message: 'O valor deve ser maior que zero'
            });
        }

        const sql = `
            UPDATE despesas 
            SET descricao = ?, categoria = ?, valor = ?, data = ?,
                data_vencimento = ?, pago = ?, forma_pagamento = ?,
                observacao = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND empresa_id = ?
        `;

        const params = [
            descricao.trim(),
            categoria.trim(),
            valor,
            data,
            data_vencimento || null,
            pago ? 1 : 0,
            forma_pagamento || null,
            observacao || null,
            id,
            empresaId
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('Erro ao atualizar despesa:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            db.get(`SELECT * FROM despesas WHERE id = ?`, [id], (err, despesa) => {
                if (err) {
                    console.error('Erro ao buscar despesa:', err);
                    return res.status(500).json({ success: false, message: err.message });
                }

                res.json({
                    success: true,
                    data: despesa,
                    message: 'Despesa atualizada com sucesso!'
                });
            });
        });
    });
});

// ============================================
// DELETE /api/financeiro/despesas/:id - EXCLUIR DESPESA
// ============================================

router.delete('/despesas/:id', auth, (req, res) => {
    const usuario = req.usuario;
    const { id } = req.params;

    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return res.status(403).json({
            success: false,
            message: 'Profissionais não podem excluir despesas'
        });
    }

    const empresaId = usuario.empresa_id;

    db.get(`SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], (err, existing) => {
        if (err) {
            console.error('Erro ao verificar despesa:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Despesa não encontrada' });
        }

        db.run(`DELETE FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], function (err) {
            if (err) {
                console.error('Erro ao excluir despesa:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({ success: true, message: 'Despesa excluída com sucesso!' });
        });
    });
});

// ============================================
// GET /api/financeiro/stats - ESTATÍSTICAS RÁPIDAS
// ============================================

router.get('/stats', auth, (req, res) => {
    const usuario = req.usuario;
    const empresaId = usuario.empresa_id;
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = String(hoje.getFullYear());

    // Buscar receitas do mês
    const receitasSql = `
        SELECT 
            COALESCE(SUM(valor), 0) as total_receitas,
            COUNT(*) as total_servicos
        FROM agendamentos
        WHERE empresa_id = ?
        AND status = 'concluido'
        AND strftime('%m', data) = ?
        AND strftime('%Y', data) = ?
    `;

    db.get(receitasSql, [empresaId, mes, ano], (err, receitas) => {
        if (err) {
            console.error('Erro ao buscar receitas:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        // Buscar despesas do mês
        const despesasSql = `
            SELECT 
                COALESCE(SUM(CASE WHEN pago = 1 THEN valor ELSE 0 END), 0) as total_pago,
                COALESCE(SUM(CASE WHEN pago = 0 THEN valor ELSE 0 END), 0) as total_pendente,
                COALESCE(SUM(valor), 0) as total_despesas
            FROM despesas
            WHERE empresa_id = ?
            AND strftime('%m', data) = ?
            AND strftime('%Y', data) = ?
        `;

        db.get(despesasSql, [empresaId, mes, ano], (err, despesas) => {
            if (err) {
                console.error('Erro ao buscar despesas:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            const totalReceitas = receitas?.total_receitas || 0;
            const totalDespesas = despesas?.total_despesas || 0;
            const totalPago = despesas?.total_pago || 0;
            const totalPendente = despesas?.total_pendente || 0;

            res.json({
                success: true,
                data: {
                    receitas: {
                        total: totalReceitas,
                        servicos: receitas?.total_servicos || 0
                    },
                    despesas: {
                        total: totalDespesas,
                        pago: totalPago,
                        pendente: totalPendente
                    },
                    lucro: {
                        bruto: totalReceitas - totalDespesas,
                        margem: totalReceitas > 0
                            ? (((totalReceitas - totalDespesas) / totalReceitas) * 100).toFixed(1)
                            : 0
                    }
                }
            });
        });
    });
});

module.exports = router;