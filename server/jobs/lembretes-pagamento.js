// ============================================
// JOB: LEMBRETES DE PAGAMENTO (FIADO)
// ============================================

const cron = require('node-cron');
const axios = require('axios');
const { db } = require('../config/database');

// ============================================
// FUNÇÃO PARA ENVIAR MENSAGEM DE COBRANÇA
// ============================================

async function enviarMensagemCobranca(whatsappInstance, numero, mensagem) {
    try {
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
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
// FUNÇÃO PARA FORMATAR DATA
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
// FUNÇÃO PARA GERAR MENSAGEM DE COBRANÇA
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

    // Mensagem base
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
    mensagem += `https://seeagende.com.br/chatbot.html?empresa=${empresa_id}\n\n`;
    mensagem += `---\n_Mensagem automática do See&Agende_`;

    return mensagem;
}

// ============================================
// FUNÇÃO PARA PROCESSAR COBRANÇAS
// ============================================

async function processarCobrancas() {
    console.log('🔔 Iniciando processamento de cobranças...');

    try {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        const daqui3Dias = new Date(hoje);
        daqui3Dias.setDate(daqui3Dias.getDate() + 3);
        const daqui7Dias = new Date(hoje);
        daqui7Dias.setDate(daqui7Dias.getDate() + 7);

        const hojeStr = hoje.toISOString().split('T')[0];
        const amanhaStr = amanha.toISOString().split('T')[0];
        const daqui3DiasStr = daqui3Dias.toISOString().split('T')[0];
        const daqui7DiasStr = daqui7Dias.toISOString().split('T')[0];

        console.log(`📅 Hoje: ${hojeStr}`);
        console.log(`📅 Amanhã: ${amanhaStr}`);
        console.log(`📅 +3 dias: ${daqui3DiasStr}`);
        console.log(`📅 +7 dias: ${daqui7DiasStr}`);

        // 🔥 BUSCAR COBRANÇAS PENDENTES
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
                e.nome as empresa_nome,
                e.telefone_dono,
                e.whatsapp_instance,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN empresas e ON a.empresa_id = e.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.forma_pagamento = 'prazo'
            AND a.status = 'concluido'
            AND a.data_vencimento IS NOT NULL
            AND (a.lembrete_cobranca_enviado IS NULL OR a.lembrete_cobranca_enviado = 0)
            AND c.telefone IS NOT NULL
            AND c.telefone != ''
            AND e.whatsapp_instance IS NOT NULL
            AND e.whatsapp_instance != ''
        `;

        const cobrancas = await new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao buscar cobranças:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });

        console.log(`📊 ${cobrancas.length} cobranças pendentes encontradas`);

        let enviadas = 0;
        let erros = 0;

        for (const cobranca of cobrancas) {
            try {
                // Calcular dias em atraso ou até vencer
                const dataVencimento = new Date(cobranca.data_vencimento);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                dataVencimento.setHours(0, 0, 0, 0);

                const diffTime = hoje - dataVencimento;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`📊 Cobrança ${cobranca.id}: ${cobranca.cliente_nome} - ${diffDays} dias`);

                // 🔥 DECIDIR SE DEVE ENVIAR
                let deveEnviar = false;
                let tipoLembrete = '';

                // Vence hoje ou amanhã
                if (diffDays === 0) {
                    deveEnviar = true;
                    tipoLembrete = 'VENCE HOJE';
                } else if (diffDays === 1) {
                    deveEnviar = true;
                    tipoLembrete = 'VENCE AMANHÃ';
                } 
                // Vence em 3 dias (lembrete antecipado)
                else if (diffDays === -3) {
                    deveEnviar = true;
                    tipoLembrete = 'VENCE EM 3 DIAS';
                }
                // Vence em 7 dias (lembrete antecipado)
                else if (diffDays === -7) {
                    deveEnviar = true;
                    tipoLembrete = 'VENCE EM 7 DIAS';
                }
                // Já venceu (atraso)
                else if (diffDays > 0 && diffDays <= 30) {
                    // Envia a cada 5 dias em atraso
                    const diasAtraso = diffDays;
                    if (diasAtraso === 5 || diasAtraso === 10 || diasAtraso === 15 || diasAtraso === 20 || diasAtraso === 25 || diasAtraso === 30) {
                        deveEnviar = true;
                        tipoLembrete = `${diasAtraso} DIAS EM ATRASO`;
                    }
                }

                if (!deveEnviar) {
                    console.log(`⏭️ Pulando cobrança ${cobranca.id} - não é momento de enviar`);
                    continue;
                }

                console.log(`📤 Enviando cobrança ${cobranca.id}: ${tipoLembrete}`);

                // Gerar mensagem
                const mensagem = gerarMensagemCobrança({
                    cliente_nome: cobranca.cliente_nome,
                    servico_nome: cobranca.servico_nome || cobranca.servico || 'Serviço',
                    valor: cobranca.valor_total || cobranca.valor || 0,
                    data_servico: cobranca.data_servico,
                    data_vencimento: cobranca.data_vencimento,
                    empresa_nome: cobranca.empresa_nome,
                    telefone_dono: cobranca.telefone_dono,
                    dias_atraso: diffDays > 0 ? diffDays : 0,
                    empresa_id: cobranca.empresa_id
                });

                // Enviar WhatsApp
                const resultado = await enviarMensagemCobranca(
                    cobranca.whatsapp_instance,
                    cobranca.telefone,
                    mensagem
                );

                if (resultado.success) {
                    // Marcar como enviado
                    await new Promise((resolve, reject) => {
                        db.run(
                            `UPDATE agendamentos 
                             SET lembrete_cobranca_enviado = 1,
                                 lembrete_cobranca_enviado_em = CURRENT_TIMESTAMP,
                                 ultimo_lembrete_cobranca_tipo = ?
                             WHERE id = ?`,
                            [tipoLembrete, cobranca.id],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });

                    enviadas++;
                    console.log(`✅ Cobrança ${cobranca.id} enviada com sucesso (${tipoLembrete})`);
                } else {
                    erros++;
                    console.error(`❌ Erro ao enviar cobrança ${cobranca.id}: ${resultado.error}`);
                }

                // Aguardar 2 segundos entre mensagens
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                erros++;
                console.error(`❌ Erro ao processar cobrança ${cobranca.id}:`, error.message);
            }
        }

        console.log(`✅ Processamento concluído: ${enviadas} enviadas, ${erros} erros`);

    } catch (error) {
        console.error('❌ Erro no processamento de cobranças:', error);
    }
}

// ============================================
// AGENDAR JOB
// ============================================

// Executar todos os dias às 09:00
cron.schedule('0 9 * * *', () => {
    console.log('🔄 [CRON] Executando job de lembretes de pagamento...');
    processarCobrancas();
});

// Executar também às 14:00 para quem vence no mesmo dia
cron.schedule('0 14 * * *', () => {
    console.log('🔄 [CRON] Executando job de lembretes de pagamento (segunda rodada)...');
    processarCobrancas();
});

console.log('✅ Job de lembretes de pagamento agendado!');

// ============================================
// EXPORTAR FUNÇÃO PARA EXECUÇÃO MANUAL
// ============================================

module.exports = {
    processarCobrancas,
    enviarMensagemCobranca,
    gerarMensagemCobrança
};