// ============================================
// ROTAS DE FINANCEIRO
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
// GET /api/financeiro
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
        let sql, params;

        if (isProduction) {
            sql = `
                SELECT 
                    a.*,
                    ${formatDate('a.data')} as data_formatada,
                    c.nome as cliente_nome,
                    s.nome as servico_nome
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                LEFT JOIN servicos s ON a.servico_id = s.id
                WHERE a.profissional_id = $1
                    AND a.empresa_id = $2
                    AND ${lower('a.status')} IN ('concluido', 'finalizado', 'concluído')
                    AND ${extractMonth('a.data')} = $3
                    AND ${extractYear('a.data')} = $4
                ORDER BY a.data DESC
            `;
            params = [profissional_id, empresa_id, parseInt(mesAtual), parseInt(anoAtual)];
        } else {
            sql = `
                SELECT 
                    a.*,
                    ${formatDate('a.data')} as data_formatada,
                    c.nome as cliente_nome,
                    s.nome as servico_nome
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                LEFT JOIN servicos s ON a.servico_id = s.id
                WHERE a.profissional_id = ?
                    AND a.empresa_id = ?
                    AND ${lower('a.status')} IN ('concluido', 'finalizado', 'concluído')
                    AND ${extractMonth('a.data')} = ?
                    AND ${extractYear('a.data')} = ?
                ORDER BY a.data DESC
            `;
            params = [profissional_id, empresa_id, mesAtual.padStart(2, '0'), String(anoAtual)];
        }

        console.log('📊 SQL Profissional:', sql);
        console.log('📊 Params:', params);

        db.all(sql, params, (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro profissional:', err.message);
                return res.json({ success: false, message: err.message });
            }

            console.log('📊 Profissional - Encontrados:', comissoes.length, 'registros');

            const dadosFormatados = comissoes.map(a => ({
                ...a,
                data: a.data_formatada || a.data,
                data_formatada: undefined,
                valor: parseFloat(a.valor) || 0,
                valor_total: parseFloat(a.valor_total) || parseFloat(a.valor) || 0,
                comissao: parseFloat(a.comissao) || 0
            }));

            const totalComissoes = dadosFormatados.reduce((s, c) => s + c.comissao, 0);

            console.log('📊 Profissional - Total Comissões:', totalComissoes);
            console.log('📊 Profissional - Total Serviços:', dadosFormatados.length);

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

        let sql, params;

        if (isProduction) {
            sql = `
                SELECT 
                    a.id,
                    to_char(a.data, 'YYYY-MM-DD') as data_formatada,
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
                    AND LOWER(a.status) IN ('concluido', 'finalizado', 'concluído')
                    AND EXTRACT(MONTH FROM a.data) = $2
                    AND EXTRACT(YEAR FROM a.data) = $3
                ORDER BY a.data DESC
            `;
            params = [empresa_id, parseInt(mes), parseInt(ano)];
        } else {
            sql = `
                SELECT 
                    a.id,
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
                    AND LOWER(a.status) IN ('concluido', 'finalizado', 'concluído')
                    AND strftime('%m', a.data) = ?
                    AND strftime('%Y', a.data) = ?
                ORDER BY a.data DESC
            `;
            params = [empresa_id, mes.padStart(2, '0'), String(ano)];
        }

        console.log('📊 SQL Dono:', sql);
        console.log('📊 Params:', params);

        db.all(sql, params, (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro dono:', err.message);
                return res.json({ success: false, message: err.message });
            }

            console.log('📊 Dono - Encontrados:', comissoes.length, 'registros');

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
        return;
    }

    // -------- SUPERADMIN (placeholder) --------
    res.status(403).json({ success: false, message: 'Acesso negado' });
});

// ============================================
// GET /api/financeiro/receitas
// ============================================
router.get('/receitas', auth, (req, res) => {
    const { mes, ano } = req.query;
    const empresaId = req.usuario.empresa_id;

    if (!mes || !ano) {
        return res.json({ success: false, message: 'Mês e ano são obrigatórios' });
    }

    let sql, params;
    if (isProduction) {
        sql = `
            SELECT 
                a.id,
                ${formatDate('a.data')} as data_formatada,
                ${coalesce('a.valor_total', 0)} as valor_total,
                a.valor,
                a.comissao,
                a.servico,
                a.cliente_id,
                a.profissional_id,
                c.nome as cliente_nome,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.empresa_id = $1
                AND ${lower('a.status')} IN ('concluido', 'finalizado', 'concluído')
                AND ${extractMonth('a.data')} = $2
                AND ${extractYear('a.data')} = $3
            ORDER BY a.data DESC
        `;
        params = [empresaId, parseInt(mes), parseInt(ano)];
    } else {
        sql = `
            SELECT 
                a.id,
                ${formatDate('a.data')} as data_formatada,
                ${coalesce('a.valor_total', 0)} as valor_total,
                a.valor,
                a.comissao,
                a.servico,
                a.cliente_id,
                a.profissional_id,
                c.nome as cliente_nome,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.empresa_id = ?
                AND ${lower('a.status')} IN ('concluido', 'finalizado', 'concluído')
                AND ${extractMonth('a.data')} = ?
                AND ${extractYear('a.data')} = ?
            ORDER BY a.data DESC
        `;
        params = [empresaId, mes.padStart(2, '0'), ano];
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar receitas:', err);
            return res.json({ success: false, message: 'Erro ao buscar receitas' });
        }

        let total = 0;
        const receitas = rows.map(row => {
            const valor = parseFloat(row.valor_total) || parseFloat(row.valor) || 0;
            total += valor;
            return {
                ...row,
                data: row.data_formatada || row.data,
                data_formatada: undefined,
                valor_total: valor,
                valor: parseFloat(row.valor) || 0,
                comissao: parseFloat(row.comissao) || 0
            };
        });

        res.json({
            success: true,
            data: {
                receitas: receitas,
                total: total,
                quantidade: receitas.length
            }
        });
    });
});

// ============================================
// GET /api/financeiro/comparativo
// ============================================
router.get('/comparativo', auth, (req, res) => {
    const { mes_atual, ano_atual, mes_anterior, ano_anterior } = req.query;
    const empresaId = req.usuario.empresa_id;

    console.log('📊 Comparativo - Parâmetros:', { mes_atual, ano_atual, mes_anterior, ano_anterior, empresaId });

    if (!mes_atual || !ano_atual || !mes_anterior || !ano_anterior) {
        return res.json({ success: false, message: 'Parâmetros incompletos' });
    }

    function getDados(mes, ano) {
        return new Promise((resolve, reject) => {
            let sql, params;

            if (isProduction) {
                sql = `
                    SELECT ${coalesceSum('COALESCE(valor_total, valor, 0)')} as total
                    FROM agendamentos
                    WHERE empresa_id = $1
                        AND ${lower('status')} IN ('concluido', 'finalizado', 'concluído')
                        AND ${extractMonth('data')} = $2
                        AND ${extractYear('data')} = $3
                `;
                params = [empresaId, parseInt(mes), parseInt(ano)];
            } else {
                sql = `
                    SELECT ${coalesceSum('COALESCE(valor_total, valor, 0)')} as total
                    FROM agendamentos
                    WHERE empresa_id = ?
                        AND status IN ('concluido', 'finalizado', 'Concluído', 'Finalizado')
                        AND ${extractMonth('data')} = ?
                        AND ${extractYear('data')} = ?
                `;
                params = [empresaId, mes.padStart(2, '0'), ano];
            }

            db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Erro faturamento:', err);
                    reject(err);
                    return;
                }
                const faturamento = parseFloat(row?.total || 0);
                console.log(`📊 Faturamento ${mes}/${ano}: R$ ${faturamento}`);

                // Buscar despesas
                let sqlDesp, paramsDesp;
                if (isProduction) {
                    sqlDesp = `
                        SELECT ${coalesceSum('valor')} as total
                        FROM despesas
                        WHERE empresa_id = $1
                            AND ${extractMonth('data')} = $2
                            AND ${extractYear('data')} = $3
                    `;
                    paramsDesp = [empresaId, parseInt(mes), parseInt(ano)];
                } else {
                    sqlDesp = `
                        SELECT ${coalesceSum('valor')} as total
                        FROM despesas
                        WHERE empresa_id = ?
                            AND ${extractMonth('data')} = ?
                            AND ${extractYear('data')} = ?
                    `;
                    paramsDesp = [empresaId, mes.padStart(2, '0'), ano];
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
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = $1
                AND ${lower('a.status')} IN ('concluido', 'finalizado', 'concluído', 'pendente')
                AND ${extractMonth('a.data')} = $2
                AND ${extractYear('a.data')} = $3
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
                AND a.status IN ('concluido', 'finalizado', 'Concluído', 'Finalizado', 'pendente')
                AND ${extractMonth('a.data')} = ?
                AND ${extractYear('a.data')} = ?
            GROUP BY ${extractDay('a.data')}
            ORDER BY dia ASC
        `;
        params = [empresaId, mes.padStart(2, '0'), ano];
    }

    console.log('📊 SQL:', sql);
    console.log('📊 Params:', params);

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro na análise diária:', err);
            return res.json({ success: false, message: 'Erro ao carregar análise: ' + err.message });
        }

        console.log(`📊 ${rows.length} rows encontrados`);

        rows.forEach(row => {
            console.log(`📊 Dia ${row.dia}: ${row.qtd_servicos} serviços, R$ ${row.faturamento}`);
        });

        const diasNoMes = new Date(ano, parseInt(mes) - 1, 0).getDate();
        const mapa = {};
        for (let d = 1; d <= diasNoMes; d++) {
            mapa[d] = { dia: d, qtd_servicos: 0, faturamento: 0 };
        }

        rows.forEach(row => {
            const dia = parseInt(row.dia) || 0;
            if (dia > 0 && dia <= diasNoMes) {
                const faturamento = parseFloat(row.faturamento) || 0;
                const qtd = parseInt(row.qtd_servicos) || 0;
                mapa[dia] = {
                    dia: dia,
                    qtd_servicos: qtd,
                    faturamento: faturamento
                };
                console.log(`📊 Dia ${dia}: ${qtd} serviços, R$ ${faturamento}`);
            }
        });

        const dias = Object.values(mapa);
        const totalServicos = dias.reduce((s, d) => s + d.qtd_servicos, 0);
        const totalFaturamento = dias.reduce((s, d) => s + d.faturamento, 0);

        console.log(`📊 Total: ${totalServicos} serviços, R$ ${totalFaturamento}`);

        const diasComMovimento = dias.filter(d => d.qtd_servicos > 0);
        const mediaServicos = diasComMovimento.length > 0
            ? diasComMovimento.reduce((s, d) => s + d.qtd_servicos, 0) / diasComMovimento.length
            : 0;

        const mediaFaturamento = diasComMovimento.length > 0
            ? diasComMovimento.reduce((s, d) => s + d.faturamento, 0) / diasComMovimento.length
            : 0;

        res.json({
            success: true,
            dados: dias,
            total_servicos: totalServicos,
            total_faturamento: totalFaturamento,
            resumo: {
                total_servicos: totalServicos,
                total_faturamento: totalFaturamento,
                media_servicos_por_dia: mediaServicos,
                media_faturamento_por_dia: mediaFaturamento,
                dias_ruins: dias.filter(d => d.qtd_servicos > 0 && d.qtd_servicos < (mediaServicos * 0.5)).length
            },
            sugestoes: dias.filter(d => d.qtd_servicos > 0 && d.qtd_servicos < (mediaServicos * 0.5)).map(d => ({
                dia: d.dia,
                qtd_servicos: d.qtd_servicos,
                faturamento: d.faturamento,
                sugestao: `📢 Dia ${d.dia} com baixo movimento (${d.qtd_servicos} serviços). Que tal oferecer ${d.qtd_servicos === 1 ? 15 : 10}% de desconto?`
            }))
        });
    });
});

module.exports = router;