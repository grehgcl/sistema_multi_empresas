// ============================================
// SERVICE DE ASSINATURAS
// Todas as funções centrais de cobrança recorrente
// ============================================

const { db } = require('../config/database');

// ============================================
// HELPERS DE DATA
// ============================================

/**
 * Retorna "YYYY-MM" do mês atual
 */
function mesReferencia(data = new Date()) {
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
}

/**
 * Retorna "YYYY-MM-DD" formatado
 */
function dataISO(data = new Date()) {
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/**
 * Adiciona N dias a uma data e retorna em "YYYY-MM-DD"
 */
function adicionarDias(dataBase, dias) {
    const d = new Date(dataBase);
    d.setDate(d.getDate() + dias);
    return dataISO(d);
}

/**
 * Diferença em dias entre duas datas
 */
function diffDias(dataA, dataB) {
    const a = new Date(dataA);
    const b = new Date(dataB);
    return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * Valor mensal por plano
 */
function valorPorPlano(plano) {
    const valores = {
        trial: 0,
        starter: 29.90,
        pro: 59.90,
        business: 119.90,
        enterprise: 249.90
    };
    return valores[(plano || 'trial').toLowerCase()] ?? 0;
}

// ============================================
// PROMISES HELPERS
// ============================================

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// ============================================
// FUNÇÕES DE NEGÓCIO
// ============================================

/**
 * Retorna a assinatura de uma empresa
 */
async function buscarAssinatura(empresaId) {
    return await get(
        `SELECT * FROM assinaturas WHERE empresa_id = ?`,
        [empresaId]
    );
}

/**
 * Cria uma assinatura pra empresa nova
 */
async function criarAssinatura(empresaId, plano, opcoes = {}) {
    const planoLower = (plano || 'trial').toLowerCase();
    const ehTrial = planoLower === 'trial';
    const valor = valorPorPlano(planoLower);
    const hoje = dataISO();

    // Trial = 7 dias a partir de hoje; pago = vencimento dia 5 do próximo mês
    let vencimento;
    if (ehTrial) {
        vencimento = opcoes.trialExpira || adicionarDias(hoje, 7);
    } else {
        vencimento = opcoes.dataVencimento || proximoDia5();
    }

    await run(`
        INSERT INTO assinaturas
            (empresa_id, plano_id, plano_nome, valor_mensal, status,
             data_inicio, data_vencimento, dia_vencimento)
        VALUES (?, ?, ?, ?, ?, ?, ?, 5)
    `, [
        empresaId,
        planoLower,
        plano || 'Trial',
        valor,
        ehTrial ? 'trial' : 'ativa',
        hoje,
        vencimento
    ]);

    return await buscarAssinatura(empresaId);
}

/**
 * Retorna a próxima data "dia 5" futura
 */
function proximoDia5() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();

    // Se já passou do dia 5, pega dia 5 do próximo mês
    if (dia >= 5) {
        const proximoMes = new Date(ano, mes + 1, 5);
        return dataISO(proximoMes);
    }
    const esteMes = new Date(ano, mes, 5);
    return dataISO(esteMes);
}

/**
 * Marca um pagamento como PAGO
 * Atualiza assinatura, libera acesso e avança vencimento em 30 dias
 */
async function registrarPagamento(pagamentoId, dados = {}) {
    const pagamento = await get(
        `SELECT * FROM pagamentos_mensalidade WHERE id = ?`,
        [pagamentoId]
    );
    if (!pagamento) throw new Error('Pagamento não encontrado');

    const agora = new Date().toISOString();

    // 1. Marca pagamento como pago
    await run(`
        UPDATE pagamentos_mensalidade
        SET status = 'pago',
            data_pagamento = ?,
            metodo = COALESCE(?, metodo),
            transacao_id = COALESCE(?, transacao_id)
        WHERE id = ?
    `, [agora, dados.metodo || null, dados.transacaoId || null, pagamentoId]);

    // 2. Atualiza assinatura
    const assinatura = await buscarAssinatura(pagamento.empresa_id);
    if (!assinatura) {
        console.warn(`⚠️ Empresa ${pagamento.empresa_id} sem assinatura`);
        return;
    }

    const novoVencimento = adicionarDias(assinatura.data_vencimento, 30);
    await run(`
        UPDATE assinaturas
        SET status = 'ativa',
            ultimo_pagamento_em = ?,
            data_vencimento = ?,
            meses_pagos = COALESCE(meses_pagos, 0) + 1,
            meses_devendo = 0,
            total_pago = COALESCE(total_pago, 0) + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE empresa_id = ?
    `, [agora, novoVencimento, pagamento.valor, pagamento.empresa_id]);

    // 3. Libera acesso da empresa (se tava bloqueada)
    await run(`
        UPDATE empresas
        SET assinatura_ativa = 1,
            assinatura_valida_ate = ?
        WHERE id = ?
    `, [novoVencimento, pagamento.empresa_id]);

    console.log(`✅ Pagamento ${pagamentoId} registrado — empresa ${pagamento.empresa_id} liberada até ${novoVencimento}`);
    return { success: true, novoVencimento };
}

/**
 * Marca pagamento como atrasado
 */
async function marcarAtrasado(pagamentoId) {
    const pagamento = await get(
        `SELECT * FROM pagamentos_mensalidade WHERE id = ?`,
        [pagamentoId]
    );
    if (!pagamento) return;

    await run(`
        UPDATE pagamentos_mensalidade
        SET status = 'atrasado'
        WHERE id = ?
    `, [pagamentoId]);

    // Incrementa meses_devendo na assinatura
    await run(`
        UPDATE assinaturas
        SET meses_devendo = COALESCE(meses_devendo, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE empresa_id = ?
    `, [pagamento.empresa_id]);

    console.log(`⚠️ Pagamento ${pagamentoId} marcado como atrasado`);
}

/**
 * Suspende empresa por inadimplência
 */
async function suspenderEmpresa(empresaId, motivo = 'inadimplencia') {
    await run(`
        UPDATE assinaturas
        SET status = 'suspensa',
            updated_at = CURRENT_TIMESTAMP
        WHERE empresa_id = ?
    `, [empresaId]);

    await run(`
        UPDATE empresas
        SET assinatura_ativa = 0
        WHERE id = ?
    `, [empresaId]);

    console.log(`🔴 Empresa ${empresaId} suspensa (${motivo})`);
    return { success: true };
}

/**
 * Cria uma nova cobrança mensal (usada pelo Job de cobrança)
 */
async function gerarCobrancaMensal(empresaId, mes = null) {
    const assinatura = await buscarAssinatura(empresaId);
    if (!assinatura) {
        console.warn(`⚠️ Empresa ${empresaId} sem assinatura`);
        return null;
    }

    const mesRef = mes || mesReferencia();

    // Verifica se já existe cobrança desse mês
    const existente = await get(`
        SELECT id FROM pagamentos_mensalidade
        WHERE empresa_id = ? AND mes_referencia = ?
    `, [empresaId, mesRef]);

    if (existente) {
        return { success: false, motivo: 'ja-existe', id: existente.id };
    }

    // Data de vencimento: dia 5 do mês
    const [ano, mesNum] = mesRef.split('-');
    const vencimento = `${ano}-${mesNum}-05`;

    await run(`
        INSERT INTO pagamentos_mensalidade
            (empresa_id, assinatura_id, mes_referencia, valor, status, data_vencimento)
        VALUES (?, ?, ?, ?, 'pendente', ?)
    `, [empresaId, assinatura.id, mesRef, assinatura.valor_mensal, vencimento]);

    console.log(`📅 Cobrança gerada: empresa ${empresaId} — ${mesRef} — R$ ${assinatura.valor_mensal} — vence ${vencimento}`);
    return { success: true };
}

/**
 * Verifica status de acesso de uma empresa
 * Retorna { bloqueado: bool, motivo: string, assinatura }
 */
async function verificarAcesso(empresaId) {
    const assinatura = await buscarAssinatura(empresaId);

    if (!assinatura) {
        return { bloqueado: false, motivo: 'sem-assinatura', assinatura: null };
    }

    // Bloqueia se suspensa
    if (assinatura.status === 'suspensa') {
        return { bloqueado: true, motivo: 'suspensa', assinatura };
    }

    // Bloqueia se vencida
    if (assinatura.status === 'vencida') {
        return { bloqueado: true, motivo: 'vencida', assinatura };
    }

    // Trial expirado também bloqueia
    if (assinatura.status === 'trial') {
        const hoje = dataISO();
        if (assinatura.data_vencimento < hoje) {
            return { bloqueado: true, motivo: 'trial-expirado', assinatura };
        }
    }

    return { bloqueado: false, motivo: 'ok', assinatura };
}

// ============================================
// EXPORTAR
// ============================================

module.exports = {
    // Helpers
    mesReferencia,
    dataISO,
    adicionarDias,
    diffDias,
    valorPorPlano,
    proximoDia5,

    // Negócio
    buscarAssinatura,
    criarAssinatura,
    registrarPagamento,
    marcarAtrasado,
    suspenderEmpresa,
    gerarCobrancaMensal,
    verificarAcesso,

    // Helpers de Promise (pra outros módulos)
    run,
    get,
    all
};