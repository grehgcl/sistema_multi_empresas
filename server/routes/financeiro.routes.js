// ============================================
// ROTAS DE FINANCEIRO - SEE&AGENDE
// ULTIMA ATUALIZACAO: 19/08/2026
// ============================================

const express = require('express');
const router = express.Router();
const { getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// FUNÇÕES AUXILIARES SQL
// ============================================

function lower(field) {
    return isProduction ? `LOWER(${field})` : `LOWER(${field})`;
}

function extractMonth(field) {
    return isProduction ? `EXTRACT(MONTH FROM ${field})` : `strftime('%m', ${field})`;
}

function extractYear(field) {
    return isProduction ? `EXTRACT(YEAR FROM ${field})` : `strftime('%Y', ${field})`;
}

function extractDay(field) {
    return isProduction ? `EXTRACT(DAY FROM ${field})` : `strftime('%d', ${field})`;
}

function formatDate(field) {
    return isProduction ? `to_char(${field}, 'YYYY-MM-DD')` : `date(${field})`;
}

function coalesce(field, fallback) {
    return isProduction ? `COALESCE(${field}, ${fallback})` : `COALESCE(${field}, ${fallback})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// GET /api/financeiro - PRINCIPAL CORRIGIDO
// ============================================

router.get('/', auth, (req, res) => {
    const role = req.usuario.role;
    const empresa_id = req.usuario.empresa_id;

    const hoje = new Date();
    const mesAtual = req.query.mes || String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = req.query.ano || hoje.getFullYear();

    console.log(`📊 Financeiro - Empresa: ${empresa_id}, Mês: ${mesAtual}, Ano: ${anoAtual}, Role: ${role}`);

    // ============================================================
    // -------- PROFISSIONAL --------
    // ============================================================
    if (role === 'profissional') {
        const profissional_id = req.usuario.id;
        const db = getEmpresaDb(empresa_id);

        if (!db) {
            return res.json({ success: false, message: 'Banco da empresa não encontrado' });
        }

        // 🔥 QUERY CORRIGIDA
        const sql = `
            SELECT 
                a.*,
                date(a.data) as data_formatada,
                c.nome as cliente_nome,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.profissional_id = ?
                AND a.empresa_id = ?
                AND LOWER(a.status) IN ('concluido', 'finalizado')
                AND strftime('%m', a.data) = ?
                AND strftime('%Y', a.data) = ?
            ORDER BY a.data DESC
        `;
        
        const params = [profissional_id, empresa_id, mesAtual.padStart(2, '0'), String(anoAtual)];

        console.log('📊 SQL Profissional:', sql);

        db.all(sql, params, (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro profissional:', err.message);
                return res.json({ success: false, message: err.message });
            }

            const dadosFormatados = comissoes.map(a => ({
                ...a,
                data: a.data_formatada || a.data,
                data_formatada: undefined,
                valor: parseFloat(a.valor) || 0,
                valor_total: parseFloat(a.valor_total) || parseFloat(a.valor) || 0,
                comissao: parseFloat(a.comissao) || 0
            }));

            const totalComissoes = dadosFormatados.reduce((s, c) => s + c.comissao, 0);

            res.json({
                success: true,
                data: {
                    comissoes: dadosFormatados,
                    totais: {
                        total_comissoes: totalComissoes,
                        total_servicos: dadosFormatados.length
                    }
                }
            });
        });
        return;
    }

    // ============================================================
    // -------- DONO --------
    // ============================================================
    if (role === 'dono') {
        const mes = req.query.mes || String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = req.query.ano || hoje.getFullYear();

        const db = getEmpresaDb(empresa_id);

        if (!db) {
            return res.json({ success: false, message: 'Banco da empresa não encontrado' });
        }

        // 🔥 QUERY CORRIGIDA
        const sql = `
            SELECT 
                a.id,
                a.forma_pagamento,
                date(a.data) as data_formatada,
                COALESCE(a.valor_total, a.valor, 0) as valor_total,
                a.valor,
                a.comissao,
                a.servico,
                a.profissional_id,
                a.cliente_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = ?
                AND LOWER(a.status) IN ('concluido', 'finalizado')
                AND strftime('%m', a.data) = ?
                AND strftime('%Y', a.data) = ?
            ORDER BY a.data DESC
        `;
        
        const params = [empresa_id, mes.padStart(2, '0'), String(ano)];

        console.log('📊 SQL Dono:', sql);
        console.log('📊 Params:', params);

        db.all(sql, params, (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro dono:', err.message);
                console.error('❌ SQL:', sql);
                console.error('❌ Params:', params);
                return res.json({ success: false, message: err.message });
            }

            let faturamentoBruto = 0;
            let totalComissoes = 0;
            const comissoesPorProfissional = {};

            for (let item of comissoes) {
                item.data = item.data_formatada || item.data;
                delete item.data_formatada;

                const valor = parseFloat(item.valor_total) || parseFloat(item.valor) || 0;
                faturamentoBruto += valor;

                if (item.profissional_id) {
                    const comissao = parseFloat(item.comissao) || 0;
                    totalComissoes += comissao;
                    const profId = item.profissional_id;
                    const profNome = item.profissional_nome || 'Profissional';
                    if (!comissoesPorProfissional[profId]) {
                        comissoesPorProfissional[profId] = {
                            id: profId,
                            nome: profNome,
                            total_comissao: 0,
                            total_servicos: 0
                        };
                    }
                    comissoesPorProfissional[profId].total_comissao += comissao;
                    comissoesPorProfissional[profId].total_servicos += 1;
                } else {
                    item.comissao = 0;
                }
            }

            const faturamentoLiquido = faturamentoBruto - totalComissoes;
            const comissoesPorProfissionalArray = Object.values(comissoesPorProfissional)
                .sort((a, b) => b.total_comissao - a.total_comissao);

            res.json({
                success: true,
                data: {
                    totais: {
                        faturamento_bruto: faturamentoBruto,
                        total_comissoes: totalComissoes,
                        faturamento_liquido: faturamentoLiquido,
                        total_servicos: comissoes.length
                    },
                    comissoes: comissoes.map(item => ({
                        ...item,
                        valor_total: parseFloat(item.valor_total) || 0,
                        comissao: parseFloat(item.comissao) || 0
                    })),
                    comissoes_por_profissional: comissoesPorProfissionalArray
                }
            });
        });
        return;
    }

    // -------- SUPERADMIN --------
    res.status(403).json({ success: false, message: 'Acesso negado para Super Admin' });
});

// ============================================
// GET /api/financeiro/comparativo - CORRIGIDO
// ============================================

router.get('/comparativo', auth, (req, res) => {
    const { mes_atual, ano_atual, mes_anterior, ano_anterior } = req.query;
    const empresaId = req.usuario.empresa_id;

    console.log('📊 Comparativo - Parâmetros:', { mes_atual, ano_atual, mes_anterior, ano_anterior, empresaId });

    if (!mes_atual || !ano_atual || !mes_anterior || !ano_anterior) {
        return res.json({ success: false, message: 'Parâmetros incompletos' });
    }

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    function getDados(mes, ano) {
        return new Promise((resolve, reject) => {
            // 🔥 QUERY CORRIGIDA
            const sql = `
                SELECT COALESCE(SUM(COALESCE(valor_total, valor, 0)), 0) as total
                FROM agendamentos
                WHERE empresa_id = ?
                    AND LOWER(status) IN ('concluido', 'finalizado')
                    AND strftime('%m', data) = ?
                    AND strftime('%Y', data) = ?
            `;
            const params = [empresaId, mes.padStart(2, '0'), String(ano)];

            console.log(`📊 SQL Faturamento ${mes}/${ano}:`, sql);

            db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Erro faturamento:', err);
                    reject(err);
                    return;
                }
                const faturamento = parseFloat(row?.total || 0);
                console.log(`📊 Faturamento ${mes}/${ano}: R$ ${faturamento}`);

                // Buscar despesas
                const sqlDesp = `
                    SELECT COALESCE(SUM(valor), 0) as total
                    FROM despesas
                    WHERE empresa_id = ?
                        AND strftime('%m', data) = ?
                        AND strftime('%Y', data) = ?
                `;
                const paramsDesp = [empresaId, mes.padStart(2, '0'), String(ano)];

                db.get(sqlDesp, paramsDesp, (err, despRow) => {
                    if (err) {
                        console.error('❌ Erro despesas:', err);
                        reject(err);
                        return;
                    }
                    const despesas = parseFloat(despRow?.total || 0);
                    console.log(`📊 Despesas ${mes}/${ano}: R$ ${despesas}`);
                    resolve({ faturamento, despesas, lucro: faturamento - despesas });
                });
            });
        });
    }

    Promise.all([
        getDados(mes_atual, ano_atual),
        getDados(mes_anterior, ano_anterior)
    ])
    .then(([mesAtual, mesAnterior]) => {
        console.log('📊 Resultado final:', { mesAtual, mesAnterior });
        res.json({
            success: true,
            data: {
                mes_atual: mesAtual,
                mes_anterior: mesAnterior
            }
        });
    })
    .catch(err => {
        console.error('❌ Erro no comparativo:', err);
        res.json({ success: false, message: 'Erro ao gerar comparativo: ' + err.message });
    });
});

// ============================================
// GET /api/financeiro/receitas - CORRIGIDO
// ============================================

router.get('/receitas', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const mes = req.query.mes || String(new Date().getMonth() + 1).padStart(2, '0');
        const ano = req.query.ano || new Date().getFullYear();

        console.log(`📊 Receitas - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}`);

        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Banco da empresa não encontrado'
            });
        }

        // 🔥 QUERY CORRIGIDA - SEM ERRO DE SYNTAXE
        let sql = `
            SELECT 
                a.id,
                a.data,
                date(a.data) as data_formatada,
                COALESCE(a.valor_total, a.valor, 0) as valor_total,
                a.valor,
                a.forma_pagamento,
                a.servico,
                a.cliente_id,
                c.nome as cliente_nome,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.empresa_id = ?
                AND LOWER(a.status) IN ('concluido', 'finalizado')
                AND strftime('%m', a.data) = ?
                AND strftime('%Y', a.data) = ?
            ORDER BY a.data DESC
        `;
        
        const params = [empresaId, mes.padStart(2, '0'), String(ano)];

        console.log('📊 SQL Receitas:', sql);
        console.log('📊 Params:', params);

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar receitas:', err.message);
                console.error('❌ SQL:', sql);
                console.error('❌ Params:', params);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            // Processar dados
            const porPagamento = {
                'dinheiro': 0,
                'pix': 0,
                'debito': 0,
                'credito': 0,
                'fiado': 0,
                'outro': 0
            };
            let total = 0;

            for (const row of rows) {
                const valor = parseFloat(row.valor_total) || 0;
                total += valor;

                const forma = (row.forma_pagamento || 'outro').toLowerCase();
                if (porPagamento[forma] !== undefined) {
                    porPagamento[forma] += valor;
                } else {
                    porPagamento['outro'] += valor;
                }
            }

            console.log(`📊 ${rows.length} receitas encontradas, Total: R$ ${total}`);
            console.log('📊 Por pagamento:', porPagamento);

            res.json({
                success: true,
                data: {
                    receitas: rows || [],
                    total: total,
                    por_pagamento: porPagamento,
                    mes: mes,
                    ano: ano
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar receitas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/financeiro/analise-diaria - CORRIGIDA
// ============================================

router.get('/analise-diaria', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const hoje = new Date();
    const mes = req.query.mes || String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = req.query.ano || hoje.getFullYear();

    console.log(`📊 Análise Diária - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}`);

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    // 🔥 QUERY CORRIGIDA PARA SQLITE
    const sql = `
        SELECT 
            strftime('%d', a.data) as dia,
            COUNT(*) as qtd_servicos,
            COALESCE(SUM(
                CASE 
                    WHEN a.valor > 0 THEN a.valor 
                    WHEN a.valor_total > 0 THEN a.valor_total 
                    ELSE (SELECT valor FROM servicos WHERE id = a.servico_id) 
                END
            ), 0) as faturamento
        FROM agendamentos a
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.empresa_id = ?
            AND LOWER(a.status) IN ('concluido', 'finalizado')
            AND strftime('%m', a.data) = ?
            AND strftime('%Y', a.data) = ?
        GROUP BY strftime('%d', a.data)
        ORDER BY dia ASC
    `;
    
    const params = [empresaId, mes.padStart(2, '0'), String(ano)];

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro na análise diária:', err.message);
            return res.json({ 
                success: false, 
                message: 'Erro ao carregar análise: ' + err.message 
            });
        }

        const diasNoMes = new Date(ano, parseInt(mes) - 1, 0).getDate();
        const mapa = {};
        for (let d = 1; d <= diasNoMes; d++) {
            const diaStr = String(d).padStart(2, '0');
            mapa[diaStr] = { dia: d, qtd_servicos: 0, faturamento: 0 };
        }

        rows.forEach(row => {
            const dia = String(row.dia).padStart(2, '0');
            const faturamento = parseFloat(row.faturamento) || 0;
            const qtd = parseInt(row.qtd_servicos) || 0;
            
            if (mapa[dia]) {
                mapa[dia] = {
                    dia: parseInt(dia),
                    qtd_servicos: qtd,
                    faturamento: faturamento
                };
            }
        });

        const dias = Object.values(mapa);
        const totalServicos = dias.reduce((s, d) => s + d.qtd_servicos, 0);
        const totalFaturamento = dias.reduce((s, d) => s + d.faturamento, 0);

        res.json({
            success: true,
            dados: dias,
            total_servicos: totalServicos,
            total_faturamento: totalFaturamento
        });
    });
});

// ============================================
// GET /api/despesas/:id - UMA DESPESA
// ============================================

router.get('/despesas/:id', auth, verificarDono, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { id } = req.params;

        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Banco da empresa não encontrado'
            });
        }

        db.get(
            `SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`,
            [id, empresaId],
            (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar despesa:', err);
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
                res.json({
                    success: true,
                    data: row
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
// DELETE /api/despesas/:id - EXCLUIR DESPESA
// ============================================

router.delete('/:id', auth, verificarDono, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { id } = req.params;

        console.log(`🗑️ [DELETE] Excluindo despesa ID: ${id}, Empresa: ${empresaId}`);

        // Verificar se o ID é válido
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: 'ID inválido'
            });
        }

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Banco da empresa não encontrado'
            });
        }

        // Verificar se a despesa existe
        const check = await new Promise((resolve, reject) => {
            db.get(
                `SELECT id, descricao FROM despesas WHERE id = ? AND empresa_id = ?`,
                [id, empresaId],
                (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao verificar despesa:', err);
                        reject(err);
                        return;
                    }
                    resolve(row);
                }
            );
        });

        if (!check) {
            console.log(`⚠️ Despesa ${id} não encontrada para empresa ${empresaId}`);
            return res.status(404).json({
                success: false,
                message: 'Despesa não encontrada'
            });
        }

        console.log(`📊 Despesa encontrada: ${check.descricao} (ID: ${check.id})`);

        // Excluir
        const result = await new Promise((resolve, reject) => {
            db.run(
                `DELETE FROM despesas WHERE id = ? AND empresa_id = ?`,
                [id, empresaId],
                function(err) {
                    if (err) {
                        console.error('❌ Erro ao excluir despesa:', err);
                        reject(err);
                        return;
                    }
                    console.log(`✅ Despesa ${id} excluída com sucesso (${this.changes} linha(s) afetada(s))`);
                    resolve({ changes: this.changes });
                }
            );
        });

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Despesa não encontrada ou já foi excluída'
            });
        }

        res.json({
            success: true,
            message: 'Despesa excluída com sucesso',
            data: { id: parseInt(id) }
        });

    } catch (error) {
        console.error('❌ Erro ao excluir despesa:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao excluir despesa'
        });
    }
});
// ============================================
// GET /api/financeiro/fiados - LISTAR FIADOS PENDENTES (CORRIGIDO)
// ============================================

router.get('/fiados', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { mes, ano } = req.query;

        console.log(`📊 Buscando fiados pendentes para empresa ${empresaId}`);

        // 🔥 USAR O BANCO DA EMPRESA
        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // 🔥 QUERY SEM A COLUNA lembrete_cobranca_enviado (ela não existe no PostgreSQL)
        let sql = `
            SELECT 
                a.id,
                a.cliente_id,
                a.servico,
                a.valor,
                a.valor_total,
                a.data,
                a.hora,
                a.data_vencimento,
                a.prazo_dias,
                a.descricao_pagamento,
                c.nome as cliente_nome,
                c.telefone,
                c.email
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            WHERE a.empresa_id = ?
            AND a.forma_pagamento = 'prazo'
            AND a.status = 'concluido'
        `;

        let params = [empresaId];

        // 🔥 FILTRO POR MÊS/ANO (se fornecido)
        if (mes && ano) {
            sql += ` AND strftime('%m', a.data) = ? AND strftime('%Y', a.data) = ?`;
            params.push(mes.padStart(2, '0'), String(ano));
        }

        // 🔥 ORDENAR POR ID DESC (mais recentes primeiro)
        sql += ` ORDER BY a.id DESC`;

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        db.all(sql, params, (err, fiados) => {
            if (err) {
                console.error('❌ Erro ao buscar fiados:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            console.log(`📊 ${fiados.length} fiados encontrados`);

            // Calcular dias em atraso
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const fiadosComStatus = fiados.map(f => {
                let status = 'pendente';
                let dias = 0;

                if (f.data_vencimento) {
                    const vencimento = new Date(f.data_vencimento);
                    vencimento.setHours(0, 0, 0, 0);
                    dias = Math.ceil((hoje - vencimento) / (1000 * 60 * 60 * 24));
                    
                    if (dias > 0) {
                        status = 'atrasado';
                    } else if (dias === 0) {
                        status = 'vence_hoje';
                    } else {
                        status = 'pendente';
                    }
                }

                return {
                    ...f,
                    dias_atraso: dias,
                    status: status,
                    valor_total: f.valor_total || f.valor || 0
                };
            });

            res.json({
                success: true,
                data: fiadosComStatus
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar fiados:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// PUT /api/financeiro/fiados/:id/baixar - BAIXAR FIADO
// ============================================

router.put('/fiados/:id/baixar', auth, verificarDono, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;
        const { forma_pagamento, enviar_confirmacao } = req.body;

        console.log(`💰 Baixando fiado ${id} - Forma: ${forma_pagamento}`);

        const { db } = require('../config/database');

        // 1. 🔍 BUSCAR DADOS DO FIADO NO BANCO PRINCIPAL
        const agendamento = await new Promise((resolve, reject) => {
            db.get(`
                SELECT a.*, c.nome as cliente_nome, c.telefone
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.id = ? AND a.empresa_id = ? AND a.forma_pagamento = 'prazo'
            `, [id, empresaId], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar agendamento:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Fiado não encontrado'
            });
        }

        // 2. 📝 ATUALIZAR O AGENDAMENTO
        await new Promise((resolve, reject) => {
            const sql = `
                UPDATE agendamentos 
                SET forma_pagamento = ?,
                    prazo_dias = 0,
                    data_vencimento = NULL,
                    descricao_pagamento = 'PAGO EM ' || datetime('now') || ' - ' || COALESCE(descricao_pagamento, ''),
                    lembrete_cobranca_enviado = 2,
                    ultimo_lembrete_cobranca_tipo = 'PAGO'
                WHERE id = ? AND empresa_id = ?
            `;
            db.run(sql, [forma_pagamento || 'dinheiro', id, empresaId], function(err) {
                if (err) {
                    console.error('❌ Erro ao atualizar:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        // 3. 📱 ENVIAR CONFIRMAÇÃO POR WHATSAPP (se solicitado)
        let mensagemEnviada = false;
        if (enviar_confirmacao !== false && agendamento.telefone) {
            try {
                const empresa = await new Promise((resolve) => {
                    db.get(
                        `SELECT nome, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
                        [empresaId],
                        (err, row) => {
                            if (err) {
                                console.error('❌ Erro ao buscar empresa:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });

                if (empresa && empresa.whatsapp_instance) {
                    const valorFormatado = (agendamento.valor_total || agendamento.valor || 0).toFixed(2).replace('.', ',');
                    const telefoneLimpo = agendamento.telefone.replace(/\D/g, '');
                    const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                    const mensagem = `✅ *Pagamento Confirmado!* 🎉\n\n` +
                        `Olá *${agendamento.cliente_nome || 'Cliente'}*!\n\n` +
                        `Seu pagamento foi registrado com sucesso!\n\n` +
                        `📋 *DETALHES:*\n` +
                        `✂️ Serviço: *${agendamento.servico || 'Serviço'}*\n` +
                        `💰 Valor: *R$ ${valorFormatado}*\n` +
                        `💳 Forma: *${forma_pagamento || 'dinheiro'}*\n\n` +
                        `Obrigado por confiar em nossos serviços! 🌟\n\n` +
                        `📞 *Contato:* ${empresa.telefone_dono || 'N/A'}\n\n` +
                        `---\n_Mensagem automática do See&Agende_`;

                    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
                    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                    const axios = require('axios');
                    await axios.post(
                        `${EVOLUTION_API_URL}/message/sendText/${empresa.whatsapp_instance}`,
                        {
                            number: numeroFormatado,
                            text: mensagem,
                            delay: 1200
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': EVOLUTION_API_KEY
                            },
                            timeout: 30000
                        }
                    );
                    mensagemEnviada = true;
                    console.log(`✅ Mensagem de confirmação enviada para ${agendamento.cliente_nome}`);
                }
            } catch (error) {
                console.error('❌ Erro ao enviar mensagem:', error.message);
            }
        }

        res.json({
            success: true,
            message: 'Fiado baixado com sucesso!',
            data: {
                id: id,
                cliente: agendamento.cliente_nome,
                servico: agendamento.servico,
                valor: agendamento.valor_total || agendamento.valor || 0,
                forma_pagamento: forma_pagamento || 'dinheiro',
                mensagem_enviada: mensagemEnviada
            }
        });

    } catch (error) {
        console.error('❌ Erro ao baixar fiado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/financeiro/fiados/stats - ESTATÍSTICAS FIADOS
// ============================================

router.get('/fiados/stats', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // 🔥 SEM O FILTRO lembrete_cobranca_enviado
        db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN data_vencimento < date('now') THEN 1 ELSE 0 END) as atrasados,
                SUM(CASE WHEN data_vencimento >= date('now') THEN 1 ELSE 0 END) as a_vencer,
                COALESCE(SUM(valor_total), 0) as valor_total,
                COALESCE(SUM(CASE WHEN data_vencimento < date('now') THEN valor_total ELSE 0 END), 0) as valor_atrasado
            FROM agendamentos 
            WHERE empresa_id = ?
            AND forma_pagamento = 'prazo'
            AND status = 'concluido'
        `, [empresaId], (err, stats) => {
            if (err) {
                console.error('❌ Erro ao buscar estatísticas fiados:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                data: {
                    total: stats?.total || 0,
                    atrasados: stats?.atrasados || 0,
                    a_vencer: stats?.a_vencer || 0,
                    valor_total: stats?.valor_total || 0,
                    valor_atrasado: stats?.valor_atrasado || 0
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// ============================================
// PUT /api/financeiro/fiados/:id/baixar - BAIXAR FIADO
// ============================================

router.put('/fiados/:id/baixar', auth, verificarDono, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;
        const { forma_pagamento, enviar_confirmacao } = req.body;

        console.log(`💰 Baixando fiado ${id} - Forma: ${forma_pagamento}`);

        // 🔥 USAR O BANCO DA EMPRESA
        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // 1. 🔍 BUSCAR DADOS DO FIADO
        const agendamento = await new Promise((resolve, reject) => {
            db.get(`
                SELECT a.*, c.nome as cliente_nome, c.telefone
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.id = ? AND a.empresa_id = ? AND a.forma_pagamento = 'prazo'
            `, [id, empresaId], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar agendamento:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Fiado não encontrado'
            });
        }

        console.log(`📋 Fiado encontrado: ${agendamento.cliente_nome} - ${agendamento.servico}`);

        // 2. 📝 ATUALIZAR O AGENDAMENTO
        await new Promise((resolve, reject) => {
            const sql = `
                UPDATE agendamentos 
                SET forma_pagamento = ?,
                    prazo_dias = 0,
                    data_vencimento = NULL,
                    descricao_pagamento = 'PAGO EM ' || datetime('now') || ' - ' || COALESCE(descricao_pagamento, '')
                WHERE id = ? AND empresa_id = ?
            `;
            db.run(sql, [forma_pagamento || 'dinheiro', id, empresaId], function(err) {
                if (err) {
                    console.error('❌ Erro ao atualizar:', err);
                    reject(err);
                } else {
                    console.log(`✅ Agendamento ${id} atualizado para PAGO`);
                    resolve();
                }
            });
        });

        // 3. 📱 ENVIAR CONFIRMAÇÃO POR WHATSAPP (se solicitado)
        let mensagemEnviada = false;
        if (enviar_confirmacao !== false && agendamento.telefone) {
            try {
                // Buscar dados da empresa no banco PRINCIPAL
                const { db: mainDb } = require('../config/database');
                const empresa = await new Promise((resolve) => {
                    mainDb.get(
                        `SELECT nome, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
                        [empresaId],
                        (err, row) => {
                            if (err) {
                                console.error('❌ Erro ao buscar empresa:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });

                if (empresa && empresa.whatsapp_instance) {
                    const valorFormatado = (agendamento.valor_total || agendamento.valor || 0).toFixed(2).replace('.', ',');
                    const telefoneLimpo = agendamento.telefone.replace(/\D/g, '');
                    const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                    const mensagem = `✅ *Pagamento Confirmado!* 🎉\n\n` +
                        `Olá *${agendamento.cliente_nome || 'Cliente'}*!\n\n` +
                        `Seu pagamento foi registrado com sucesso!\n\n` +
                        `📋 *DETALHES:*\n` +
                        `✂️ Serviço: *${agendamento.servico || 'Serviço'}*\n` +
                        `💰 Valor: *R$ ${valorFormatado}*\n` +
                        `💳 Forma: *${forma_pagamento || 'dinheiro'}*\n\n` +
                        `Obrigado por confiar em nossos serviços! 🌟\n\n` +
                        `📞 *Contato:* ${empresa.telefone_dono || 'N/A'}\n\n` +
                        `---\n_Mensagem automática do See&Agende_`;

                    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
                    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                    const axios = require('axios');
                    await axios.post(
                        `${EVOLUTION_API_URL}/message/sendText/${empresa.whatsapp_instance}`,
                        {
                            number: numeroFormatado,
                            text: mensagem,
                            delay: 1200
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': EVOLUTION_API_KEY
                            },
                            timeout: 30000
                        }
                    );
                    mensagemEnviada = true;
                    console.log(`✅ Mensagem de confirmação enviada para ${agendamento.cliente_nome}`);
                }
            } catch (error) {
                console.error('❌ Erro ao enviar mensagem:', error.message);
            }
        }

        res.json({
            success: true,
            message: 'Fiado baixado com sucesso!',
            data: {
                id: id,
                cliente: agendamento.cliente_nome,
                servico: agendamento.servico,
                valor: agendamento.valor_total || agendamento.valor || 0,
                forma_pagamento: forma_pagamento || 'dinheiro',
                mensagem_enviada: mensagemEnviada
            }
        });

    } catch (error) {
        console.error('❌ Erro ao baixar fiado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// ============================================
// POST /api/financeiro/receitas/manual - ADICIONAR RECEITA MANUAL
// ============================================

router.post('/receitas/manual', auth, verificarDono, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { descricao, valor, data, forma_pagamento, categoria, observacao } = req.body;

        console.log(`📝 Adicionando receita manual - Empresa: ${empresaId}`);

        // Validações
        if (!descricao || !valor || !data) {
            return res.status(400).json({
                success: false,
                message: 'Descrição, valor e data são obrigatórios'
            });
        }

        if (valor <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valor deve ser maior que zero'
            });
        }

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // 🔥 Inserir receita manual como um agendamento "manual"
        const sql = `
            INSERT INTO agendamentos 
            (empresa_id, cliente_id, servico, valor, valor_total, data, hora, status, forma_pagamento, created_at, descricao_pagamento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            empresaId,
            null, // cliente_id = null (manual)
            descricao || 'Receita manual',
            parseFloat(valor),
            parseFloat(valor),
            data,
            '00:00',
            'concluido',
            forma_pagamento || 'dinheiro',
            new Date().toISOString(),
            observacao || 'Receita adicionada manualmente'
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error("❌ Erro ao adicionar receita manual:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            const id = this.lastID;
            console.log(`✅ Receita manual adicionada com ID: ${id}`);

            res.json({
                success: true,
                message: 'Receita adicionada com sucesso!',
                data: {
                    id: id,
                    descricao: descricao,
                    valor: valor,
                    data: data,
                    forma_pagamento: forma_pagamento
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao adicionar receita manual:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// DELETE /api/financeiro/receitas/manual/:id - EXCLUIR RECEITA MANUAL
// ============================================

router.delete('/receitas/manual/:id', auth, verificarDono, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { id } = req.params;

        console.log(`🗑️ Excluindo receita manual ID: ${id}`);

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // Verificar se existe e é manual (cliente_id = null)
        db.get(
            `SELECT id FROM agendamentos WHERE id = ? AND empresa_id = ? AND cliente_id IS NULL`,
            [id, empresaId],
            (err, row) => {
                if (err) {
                    console.error("❌ Erro ao verificar receita:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                if (!row) {
                    return res.status(404).json({
                        success: false,
                        message: 'Receita manual não encontrada'
                    });
                }

                db.run(
                    `DELETE FROM agendamentos WHERE id = ? AND empresa_id = ?`,
                    [id, empresaId],
                    function(err) {
                        if (err) {
                            console.error("❌ Erro ao excluir receita:", err);
                            return res.status(500).json({
                                success: false,
                                message: err.message
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Receita manual excluída com sucesso!'
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error('❌ Erro ao excluir receita manual:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
module.exports = router;