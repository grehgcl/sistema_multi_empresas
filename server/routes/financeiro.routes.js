// ============================================
// ROTAS DE FINANCEIRO - CORRIGIDO
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// FUNÇÕES AUXILIARES SQL
// ============================================

function lower(field) {
    return `LOWER(${field})`;
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

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// GET /api/financeiro - FINANCEIRO DONO
// ============================================
router.get('/', auth, verificarDono, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const hoje = new Date();
        const mes = req.query.mes || String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = req.query.ano || hoje.getFullYear();

        console.log(`📊 Financeiro - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}, Role: ${req.usuario.role}`);

        let sql, params;

        if (isProduction) {
            sql = `
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
                WHERE a.empresa_id = $1
                    AND LOWER(a.status) IN ('concluido', 'finalizado')
                    AND EXTRACT(MONTH FROM a.data) = $2
                    AND EXTRACT(YEAR FROM a.data) = $3
                ORDER BY a.data DESC
            `;
            params = [empresaId, parseInt(mes), parseInt(ano)];
        } else {
            sql = `
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
            params = [empresaId, mes, ano];
        }

        console.log('📊 SQL Dono:', sql);
        console.log('📊 Params:', params);

        db.all(sql, params, (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro dono:', err.message);
                return res.json({ success: false, message: err.message });
            }

            console.log('📊 Dono - Encontrados:', comissoes ? comissoes.length : 0, 'registros');

            if (!comissoes || comissoes.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        totais: {
                            faturamento_bruto: 0,
                            total_comissoes: 0,
                            faturamento_liquido: 0,
                            total_servicos: 0
                        },
                        comissoes: [],
                        comissoes_por_profissional: []
                    }
                });
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

            console.log('📊 Dono - Faturamento Bruto:', faturamentoBruto);
            console.log('📊 Dono - Total Serviços:', comissoes.length);

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

    } catch (error) {
        console.error('❌ Erro no financeiro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/financeiro/receitas - RECEITAS
// ============================================
router.get('/receitas', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const hoje = new Date();
        const mes = req.query.mes || String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = req.query.ano || hoje.getFullYear();

        console.log(`📊 Receitas - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}`);

        let sql, params;

        if (isProduction) {
            sql = `
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
                WHERE a.empresa_id = $1
                    AND LOWER(a.status) IN ('concluido', 'finalizado')
                    AND EXTRACT(MONTH FROM a.data) = $2
                    AND EXTRACT(YEAR FROM a.data) = $3
                ORDER BY a.data DESC
            `;
            params = [empresaId, parseInt(mes), parseInt(ano)];
        } else {
            sql = `
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
            params = [empresaId, mes, ano];
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar receitas:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            const porPagamento = {
                'dinheiro': 0,
                'pix': 0,
                'debito': 0,
                'credito': 0,
                'fiado': 0,
                'outro': 0
            };
            let total = 0;

            for (const row of rows || []) {
                const valor = parseFloat(row.valor_total) || 0;
                total += valor;

                const forma = (row.forma_pagamento || 'outro').toLowerCase();
                if (porPagamento[forma] !== undefined) {
                    porPagamento[forma] += valor;
                } else {
                    porPagamento['outro'] += valor;
                }
            }

            console.log(`📊 ${rows ? rows.length : 0} receitas encontradas, Total: R$ ${total}`);
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
// GET /api/financeiro/comparativo
// ============================================
router.get('/comparativo', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const hoje = new Date();
    const mesAtual = req.query.mes_atual || String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = req.query.ano_atual || hoje.getFullYear();

    const dataAnterior = new Date(hoje);
    dataAnterior.setMonth(dataAnterior.getMonth() - 1);
    const mesAnterior = req.query.mes_anterior || String(dataAnterior.getMonth() + 1).padStart(2, '0');
    const anoAnterior = req.query.ano_anterior || dataAnterior.getFullYear();

    console.log('📊 Comparativo:', { mesAtual, anoAtual, mesAnterior, anoAnterior, empresaId });

    function getDados(mes, ano) {
        return new Promise((resolve, reject) => {
            let sql, params;

            if (isProduction) {
                sql = `
                    SELECT ${coalesceSum('COALESCE(valor_total, valor, 0)')} as total
                    FROM agendamentos
                    WHERE empresa_id = $1
                        AND LOWER(status) IN ('concluido', 'finalizado')
                        AND EXTRACT(MONTH FROM data) = $2
                        AND EXTRACT(YEAR FROM data) = $3
                `;
                params = [empresaId, parseInt(mes), parseInt(ano)];
            } else {
                sql = `
                    SELECT ${coalesceSum('COALESCE(valor_total, valor, 0)')} as total
                    FROM agendamentos
                    WHERE empresa_id = ?
                        AND LOWER(status) IN ('concluido', 'finalizado')
                        AND strftime('%m', data) = ?
                        AND strftime('%Y', data) = ?
                `;
                params = [empresaId, mes, ano];
            }

            db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Erro faturamento:', err);
                    reject(err);
                    return;
                }
                const faturamento = parseFloat(row?.total || 0);
                console.log(`📊 Faturamento ${mes}/${ano}: R$ ${faturamento}`);

                let sqlDesp, paramsDesp;
                if (isProduction) {
                    sqlDesp = `
                        SELECT ${coalesceSum('valor')} as total
                        FROM despesas
                        WHERE empresa_id = $1
                            AND EXTRACT(MONTH FROM data) = $2
                            AND EXTRACT(YEAR FROM data) = $3
                    `;
                    paramsDesp = [empresaId, parseInt(mes), parseInt(ano)];
                } else {
                    sqlDesp = `
                        SELECT ${coalesceSum('valor')} as total
                        FROM despesas
                        WHERE empresa_id = ?
                            AND strftime('%m', data) = ?
                            AND strftime('%Y', data) = ?
                    `;
                    paramsDesp = [empresaId, mes, ano];
                }

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
        getDados(mesAtual, anoAtual),
        getDados(mesAnterior, anoAnterior)
    ])
        .then(([mesAtualData, mesAnteriorData]) => {
            console.log('📊 Resultado final:', { mesAtualData, mesAnteriorData });
            res.json({
                success: true,
                data: {
                    mes_atual: mesAtualData,
                    mes_anterior: mesAnteriorData
                }
            });
        })
        .catch(err => {
            console.error('❌ Erro no comparativo:', err);
            res.json({ success: false, message: 'Erro ao gerar comparativo' });
        });
});

// ============================================
// GET /api/financeiro/analise-diaria
// ============================================
router.get('/analise-diaria', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const hoje = new Date();
    const mes = req.query.mes || String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = req.query.ano || hoje.getFullYear();

    console.log(`📊 Análise Diária - Empresa: ${empresaId}, Mês: ${mes}, Ano: ${ano}`);

    let sql, params;

    if (isProduction) {
        sql = `
            SELECT 
                ${extractDay('a.data')} as dia,
                COUNT(*) as qtd_servicos,
                ${coalesceSum(
                    'CASE ' +
                    'WHEN a.valor > 0 THEN a.valor ' +
                    'WHEN a.valor_total > 0 THEN a.valor_total ' +
                    'ELSE (SELECT valor FROM servicos WHERE id = a.servico_id) ' +
                    'END'
                )} as faturamento
            FROM agendamentos a
            WHERE a.empresa_id = $1
                AND LOWER(a.status) IN ('concluido', 'finalizado', 'pendente')
                AND EXTRACT(MONTH FROM a.data) = $2
                AND EXTRACT(YEAR FROM a.data) = $3
            GROUP BY ${extractDay('a.data')}
            ORDER BY dia ASC
        `;
        params = [empresaId, parseInt(mes), parseInt(ano)];
    } else {
        sql = `
            SELECT 
                ${extractDay('a.data')} as dia,
                COUNT(*) as qtd_servicos,
                ${coalesceSum(
                    'CASE ' +
                    'WHEN a.valor > 0 THEN a.valor ' +
                    'WHEN a.valor_total > 0 THEN a.valor_total ' +
                    'ELSE (SELECT valor FROM servicos WHERE id = a.servico_id) ' +
                    'END'
                )} as faturamento
            FROM agendamentos a
            WHERE a.empresa_id = ?
                AND LOWER(a.status) IN ('concluido', 'finalizado', 'pendente')
                AND strftime('%m', a.data) = ?
                AND strftime('%Y', a.data) = ?
            GROUP BY ${extractDay('a.data')}
            ORDER BY dia ASC
        `;
        params = [empresaId, mes, ano];
    }

    console.log('📊 SQL:', sql);
    console.log('📊 Params:', params);

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro na análise diária:', err);
            return res.json({ success: false, message: 'Erro ao carregar análise: ' + err.message });
        }

        const diasNoMes = new Date(ano, parseInt(mes), 0).getDate();
        const mapa = {};
        for (let d = 1; d <= diasNoMes; d++) {
            mapa[d] = { dia: d, qtd_servicos: 0, faturamento: 0 };
        }

        for (const row of rows || []) {
            const dia = parseInt(row.dia) || 0;
            if (dia > 0 && dia <= diasNoMes) {
                mapa[dia] = {
                    dia: dia,
                    qtd_servicos: parseInt(row.qtd_servicos) || 0,
                    faturamento: parseFloat(row.faturamento) || 0
                };
            }
        }

        const dias = Object.values(mapa);

        res.json({
            success: true,
            dados: dias
        });
    });
});

module.exports = router;