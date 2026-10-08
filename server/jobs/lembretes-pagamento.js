// ============================================
// JOB: LEMBRETES DE PAGAMENTO (FIADO)
// ============================================

const cron = require('node-cron');
const axios = require('axios');
const { db, getEmpresaDb } = require('../config/database');

// ============================================
// ENVIA MENSAGEM DE COBRANÇA
// ============================================
async function enviarMensagemCobranca(whatsappInstance, numero, mensagem) {
    try {
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080';
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

        const numeroLimpo = numero.replace(/\D/g, '');
        const numeroFormatado = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;

        console.log(`📱 Enviando cobrança para: ${numeroFormatado}`);
        console.log(`📱 Instância: ${whatsappInstance}`);

        const response = await axios.post(
            `${EVOLUTION_API_URL}/message/sendText/${whatsappInstance}`,
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

        console.log(`✅ Cobrança enviada para ${numeroFormatado}`);
        return { success: true, data: response.data };

    } catch (error) {
        console.error('❌ Erro ao enviar cobrança:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// FORMATA DATA
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

// ============================================
// GERA MENSAGEM DE COBRANÇA
// ============================================
function gerarMensagemCobrança(dados) {
    const {
        cliente_nome,
        servico_nome,
        valor,
        data_servico,
        data_vencimento,
        empresa_nome,
        telefone_dono,
        dias_atraso,
        empresa_id
    } = dados;

    const valorFormatado = (parseFloat(valor) || 0).toFixed(2).replace('.', ',');

    let mensagem = `💳 *Lembrete de Pagamento - Fiado* 💳\n\n`;
    mensagem += `Olá *${cliente_nome || 'Cliente'}*!\n\n`;
    mensagem += `⚠️ Seu pagamento referente ao serviço realizado na *${empresa_nome || 'See&Agende'}* está pendente.\n\n`;
    mensagem += `📋 *DETALHES DA COBRANÇA:*\n`;
    mensagem += `✂️ Serviço: *${servico_nome || 'Serviço'}*\n`;
    mensagem += `📅 Data: *${formatarDataBr(data_servico)}*\n`;
    mensagem += `💰 Valor: *R$ ${valorFormatado}*\n`;
    mensagem += `📅 Vencimento: *${formatarDataBr(data_vencimento)}*\n`;

    if (dias_atraso > 0) {
        mensagem += `⏳ Dias em atraso: *${dias_atraso} dias*\n`;
        mensagem += `⚠️ *ATENÇÃO:* Pagamento em atraso!\n\n`;
    } else if (dias_atraso === 0) {
        mensagem += `⏳ *Vence HOJE!* ⏳\n\n`;
    } else {
        mensagem += `⏳ Vence em *${Math.abs(dias_atraso)} dias*.\n\n`;
    }

    mensagem += `💡 *Formas de pagamento disponíveis:*\n`;
    mensagem += `💰 Dinheiro\n`;
    mensagem += `📱 PIX\n`;
    mensagem += `💳 Débito\n`;
    mensagem += `💳 Crédito\n\n`;

    mensagem += `📞 *Contato para pagamento:*\n`;
    mensagem += `${telefone_dono || 'N/A'}\n\n`;

    if (dias_atraso > 0) {
        mensagem += `⚠️ *Regularize sua situação!* Evite novos bloqueios.\n\n`;
    }

    mensagem += `🔗 *Veja seus agendamentos:*\n`;
    mensagem += `${process.env.BASE_URL || 'https://seeagende.tech'}/chatbot.html?empresa=${empresa_id}\n\n`;
    mensagem += `---\n_Mensagem automática do See&Agende_`;

    return mensagem;
}

// ============================================
// LISTA TODAS AS EMPRESAS
// ============================================
async function listarEmpresas() {
    return new Promise((resolve) => {
        db.all(`SELECT id, nome, telefone_dono, whatsapp_instance FROM empresas`, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao listar empresas:', err.message);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
}

// ============================================
// BUSCA COBRANÇAS DE UMA EMPRESA (banco próprio)
// ============================================
async function buscarCobrancasEmpresa(empresaId) {
    const empresaDb = getEmpresaDb(empresaId);
    if (!empresaDb) return [];

    const sql = `
        SELECT 
            a.id,
            a.cliente_id,
            a.data as data_servico,
            a.servico,
            a.valor,
            a.valor_total,
            a.forma_pagamento,
            a.prazo_dias,
            a.data_vencimento,
            a.descricao_pagamento,
            a.empresa_id,
            a.lembrete_cobranca_enviado,
            c.nome as cliente_nome,
            c.telefone,
            c.email,
            s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.forma_pagamento = 'prazo'
          AND a.status = 'concluido'
          AND a.data_vencimento IS NOT NULL
          AND (a.lembrete_cobranca_enviado IS NULL OR a.lembrete_cobranca_enviado = 0)
          AND c.telefone IS NOT NULL
          AND c.telefone != ''
    `;

    return new Promise((resolve) => {
        empresaDb.all(sql, [], (err, rows) => {
            if (err) {
                console.error(`❌ Erro ao buscar cobranças da empresa ${empresaId}:`, err.message);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
}

// ============================================
// MARCA COMO ENVIADO
// ============================================
async function marcarComoEnviado(empresaDb, cobrancaId, tipoLembrete) {
    return new Promise((resolve) => {
        empresaDb.run(
            `UPDATE agendamentos 
             SET lembrete_cobranca_enviado = 1,
                 lembrete_cobranca_enviado_em = CURRENT_TIMESTAMP,
                 ultimo_lembrete_cobranca_tipo = ?
             WHERE id = ?`,
            [tipoLembrete, cobrancaId],
            (err) => {
                if (err) console.error(`❌ Erro ao marcar cobrança ${cobrancaId}:`, err.message);
                resolve();
            }
        );
    });
}

// ============================================
// PROCESSA COBRANÇAS DE TODAS AS EMPRESAS
// ============================================
async function processarCobrancas() {
    console.log('🔔 ================================');
    console.log('🔔 Iniciando processamento de cobranças...');
    console.log(`🔔 Agora: ${new Date().toLocaleString('pt-BR')}`);

    try {
        const empresas = await listarEmpresas();
        console.log(`🔔 Empresas encontradas: ${empresas.length}`);

        let totalEnviadas = 0;
        let totalErros = 0;

        // Cache pra evitar processar empresa duplicada
        const empresasProcessadas = new Set();

        for (const empresa of empresas) {
            const empresaId = empresa.id;

            if (empresasProcessadas.has(empresaId)) continue;
            empresasProcessadas.add(empresaId);

            // Pula empresa sem WhatsApp
            if (!empresa.whatsapp_instance) {
                continue;
            }

            const empresaDb = getEmpresaDb(empresaId);
            if (!empresaDb) {
                console.log(`⚠️ Empresa ${empresaId}: banco não encontrado`);
                continue;
            }

            const cobrancas = await buscarCobrancasEmpresa(empresaId);

            if (cobrancas.length === 0) {
                continue;
            }

            console.log(`📊 Empresa ${empresaId} (${empresa.nome}): ${cobrancas.length} cobranças pendentes`);

            for (const cobranca of cobrancas) {
                try {
                    // Calcula dias até vencer / em atraso
                    const dataVencimento = new Date(cobranca.data_vencimento + 'T00:00:00');
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    dataVencimento.setHours(0, 0, 0, 0);

                    const diffTime = hoje - dataVencimento;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Decide se deve enviar
                    let deveEnviar = false;
                    let tipoLembrete = '';

                    if (diffDays === 0) {
                        deveEnviar = true;
                        tipoLembrete = 'VENCE HOJE';
                    } else if (diffDays === 1) {
                        deveEnviar = true;
                        tipoLembrete = 'VENCE AMANHÃ';
                    } else if (diffDays === -3) {
                        deveEnviar = true;
                        tipoLembrete = 'VENCE EM 3 DIAS';
                    } else if (diffDays === -7) {
                        deveEnviar = true;
                        tipoLembrete = 'VENCE EM 7 DIAS';
                    } else if (diffDays > 0 && diffDays <= 30) {
                        const diasAtraso = diffDays;
                        if ([5, 10, 15, 20, 25, 30].includes(diasAtraso)) {
                            deveEnviar = true;
                            tipoLembrete = `${diasAtraso} DIAS EM ATRASO`;
                        }
                    }

                    if (!deveEnviar) continue;

                    console.log(`📤 [${tipoLembrete}] ${cobranca.cliente_nome} · R$ ${cobranca.valor_total || cobranca.valor}`);

                    const mensagem = gerarMensagemCobrança({
                        cliente_nome: cobranca.cliente_nome,
                        servico_nome: cobranca.servico_nome || cobranca.servico || 'Serviço',
                        valor: cobranca.valor_total || cobranca.valor || 0,
                        data_servico: cobranca.data_servico,
                        data_vencimento: cobranca.data_vencimento,
                        empresa_nome: empresa.nome,
                        telefone_dono: empresa.telefone_dono,
                        dias_atraso: diffDays > 0 ? diffDays : 0,
                        empresa_id: cobranca.empresa_id
                    });

                    const resultado = await enviarMensagemCobranca(
                        empresa.whatsapp_instance,
                        cobranca.telefone,
                        mensagem
                    );

                    if (resultado.success) {
                        await marcarComoEnviado(empresaDb, cobranca.id, tipoLembrete);
                        totalEnviadas++;
                        console.log(`✅ Cobrança ${cobranca.id} enviada`);
                    } else {
                        totalErros++;
                        console.error(`❌ Erro cobrança ${cobranca.id}: ${resultado.error}`);
                    }

                    // Pausa entre envios
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error) {
                    totalErros++;
                    console.error(`❌ Erro cobrança ${cobranca.id}:`, error.message);
                }
            }
        }

        console.log(`🔔 ✅ Concluído: ${totalEnviadas} enviadas, ${totalErros} erros`);
        console.log('🔔 ================================');

    } catch (error) {
        console.error('❌ Erro geral no job de cobranças:', error);
    }
}

// ============================================
// INICIA O JOB (chamado pelo server.js)
// ============================================
function start() {
    // Roda a cada 30 minutos
    cron.schedule('*/30 * * * *', async () => {
        console.log('🔄 [CRON] Executando job de lembretes de pagamento...');
        await processarCobrancas();
    });

    console.log('✅ Job de lembretes de pagamento iniciado (a cada 30 min)');

    // Primeira execução após 45s do start
    setTimeout(() => {
        console.log('🔄 [CRON] Primeira execução do job de cobranças...');
        processarCobrancas();
    }, 45000);
}

// ============================================
// EXPORTAR
// ============================================
module.exports = {
    start,                    // 🔥 NOVO (era o que faltava)
    processarCobrancas,
    enviarMensagemCobranca,
    gerarMensagemCobrança
};