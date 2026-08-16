// ============================================
// SERVIÇO WHATSAPP - VERSÃO CORRIGIDA
// ============================================

const axios = require('axios');
const { getEmpresaDb } = require('../config/database');

// ============================================
// CONFIGURAÇÃO
// ============================================
const config = {
    evolution: {
        apiUrl: process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080',
        apiKey: process.env.EVOLUTION_API_KEY || 'seeagende2024',
        defaultInstance: 'seeagende',
    },
    geral: {
        provider: process.env.WHATSAPP_PROVIDER || 'evolution',
        enabled: process.env.WHATSAPP_ENABLED === 'true',
    }
};

const BASE_URL = process.env.BASE_URL || 'https://seeagende.com.br';

console.log(`[WHATSAPP] 📱 Provedor configurado: ${config.geral.provider}`);
console.log(`[WHATSAPP] 🌐 BASE_URL: ${BASE_URL}`);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) return data.toLocaleDateString('pt-BR');
        return dataStr;
    } catch {
        return dataStr;
    }
}

function formatarTelefone(telefone) {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
    } else if (numeros.length === 10) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
    }
    return telefone;
}

function formatNumber(number) {
    let clean = String(number).replace(/\D/g, '');
    if (!clean.startsWith('55')) clean = '55' + clean;
    return clean;
}

// ============================================
// FUNÇÃO PARA OBTER INSTÂNCIA DA EMPRESA
// ============================================
async function getInstanciaEmpresa(empresaId) {
    if (!empresaId) return config.evolution.defaultInstance;

    try {
        const db = getEmpresaDb(empresaId);
        if (!db) return config.evolution.defaultInstance;

        const empresa = await new Promise((resolve) => {
            db.get('SELECT whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                if (err) {
                    console.error('[WHATSAPP] Erro ao buscar empresa:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (empresa && empresa.whatsapp_proprio_habilitado && empresa.whatsapp_instance) {
            // Verificar se a instância está conectada
            try {
                const statusRes = await axios.get(`${config.evolution.apiUrl}/instance/connectionState/${empresa.whatsapp_instance}`, {
                    headers: { 'apikey': config.evolution.apiKey },
                    timeout: 5000
                });
                if (statusRes.data?.instance?.state === 'open' || statusRes.data?.instance?.state === 'connected') {
                    console.log(`[WHATSAPP] 📱 Usando instância própria: ${empresa.whatsapp_instance}`);
                    return empresa.whatsapp_instance;
                }
            } catch (e) {
                console.log('[WHATSAPP] Instância própria não disponível, usando fallback');
            }
        }

        return config.evolution.defaultInstance;
    } catch (e) {
        console.error('[WHATSAPP] Erro ao buscar instância:', e.message);
        return config.evolution.defaultInstance;
    }
}

// ============================================
// ENVIAR MENSAGEM
// ============================================
async function send(empresaId, numero, mensagem) {
    if (!config.geral.enabled) {
        console.log('[WHATSAPP] Desabilitado');
        return { success: false, error: 'WhatsApp desabilitado' };
    }
    if (!numero) {
        console.log('[WHATSAPP] Número não fornecido');
        return { success: false, error: 'Número não fornecido' };
    }

    try {
        const instanceName = await getInstanciaEmpresa(empresaId);
        const finalNumber = formatNumber(numero);
        const url = `${config.evolution.apiUrl}/message/sendText/${instanceName}`;

        console.log(`[WHATSAPP] 📤 Enviando para ${finalNumber} via ${instanceName}`);

        const response = await axios.post(url, {
            number: finalNumber,
            text: mensagem,
            delay: 1200
        }, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolution.apiKey
            },
            timeout: 30000
        });

        console.log(`[WHATSAPP] ✅ Mensagem enviada com sucesso para ${finalNumber}`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`[WHATSAPP] ❌ Erro ao enviar mensagem:`, error.message);
        if (error.response) {
            console.error(`[WHATSAPP] Status: ${error.response.status}`);
            console.error(`[WHATSAPP] Dados:`, error.response.data);
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// GERAR LINK DO CHATBOT
// ============================================
function gerarLinkChatbot(empresa) {
    const id = empresa?.id || '1';
    return `${BASE_URL}/chatbot.html?empresa=${id}`;
}

// ============================================
// GERAR MENSAGEM DE CONFIRMAÇÃO
// ============================================
function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink) {
    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'nossa empresa';

    if (!chatbotLink) {
        chatbotLink = gerarLinkChatbot(empresa);
    }

    const enderecoCompleto = empresa?.endereco || '';
    let mapsLink = '';
    let wazeLink = '';
    if (enderecoCompleto) {
        const enderecoEncoded = encodeURIComponent(enderecoCompleto);
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`;
        wazeLink = `https://waze.com/ul?q=${enderecoEncoded}&navigate=yes`;
    }

    let whatsappLink = '';
    if (empresa?.telefone_dono) {
        const telLimpo = empresa.telefone_dono.replace(/\D/g, '');
        whatsappLink = `https://wa.me/55${telLimpo}`;
    }

    let msg = `🌟 *${nomeEmpresa.toUpperCase()}* 🌟\n\n`;
    msg += `Olá *${cliente?.nome || 'Cliente'}*! Seu agendamento foi confirmado! ✅\n\n`;
    msg += `📋 *DETALHES DO AGENDAMENTO:*\n`;
    msg += `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}*\n`;
    msg += `⏰ Hora: *${hora}*\n`;
    msg += `💰 Valor: *R$ ${valorFormatado}*\n\n`;

    if (profissional?.nome) msg += `👤 Profissional: *${profissional.nome}*\n\n`;

    if (empresa?.endereco) {
        msg += `📍 *Endereço:* ${empresa.endereco}\n\n`;
        msg += `🚗 *COMO CHEGAR:*\n`;
        if (mapsLink) msg += `🗺️ *Google Maps:* ${mapsLink}\n`;
        if (wazeLink) msg += `🚗 *Waze:* ${wazeLink}\n`;
        msg += `\n`;
    }

    if (empresa?.telefone_dono) {
        msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n`;
        if (whatsappLink) msg += `💬 *WhatsApp:* ${whatsappLink}\n`;
        msg += `\n`;
    }

    msg += `💡 *Dica:* Chegue 10 minutos antes!\n\n`;
    msg += `🔗 *Agende novamente:*\n${chatbotLink}\n\n`;
    msg += `---\n_Mensagem automática do See&Agende_`;

    return msg;
}

// ============================================
// ENVIAR CONFIRMAÇÃO
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!cliente?.telefone) {
        console.log('[WHATSAPP] ⚠️ Cliente sem telefone');
        return { success: false, error: 'Sem telefone' };
    }

    const chatbotLink = gerarLinkChatbot(empresa);
    const mensagem = gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink);
    return await send(empresa?.id, cliente.telefone, mensagem);
}

// ============================================
// ENVIAR CANCELAMENTO
// ============================================
async function enviarCancelamento(dados) {
    const { cliente, servico, data, hora, empresa } = dados;
    if (!cliente?.telefone) {
        console.log('[WHATSAPP] ⚠️ Cliente sem telefone');
        return { success: false, error: 'Sem telefone' };
    }

    let msg = `⚠️ *Agendamento Cancelado*\n\n`;
    msg += `Olá *${cliente?.nome}*!\n`;
    msg += `✂️ Serviço: *${servico?.nome}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}* às *${hora}*\n\n`;
    msg += `Estamos à disposição para remarcar! 😊`;

    return await send(empresa?.id, cliente.telefone, msg);
}

// ============================================
// ENVIAR CONCLUSÃO
// ============================================
async function enviarConclusao(dados) {
    const { cliente, servico, data, hora, profissional, empresa, agendamento_id } = dados;

    console.log('[WHATSAPP] 📝 Enviando conclusão para:', cliente?.nome);

    if (!cliente?.telefone) {
        console.log('[WHATSAPP] ⚠️ Cliente sem telefone');
        return { success: false, error: 'Sem telefone' };
    }

    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'nossa empresa';
    const servicoNome = servico?.nome || 'Serviço';

    const chatbotLink = gerarLinkChatbot(empresa);

    let msg = `✅ *Atendimento Concluído!* 🎉\n\n`;
    msg += `Olá *${cliente?.nome}*!\n`;
    msg += `Obrigado por escolher a *${nomeEmpresa}*!\n\n`;
    msg += `📋 *RESUMO DO SERVIÇO:*\n`;
    msg += `✂️ Serviço: *${servicoNome}*\n`;
    msg += `💰 Valor: *R$ ${valorFormatado}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}* às *${hora}*\n\n`;

    if (profissional?.nome) {
        msg += `👤 Profissional: *${profissional.nome}*\n\n`;
    }

    if (empresa?.endereco) {
        msg += `📍 *Endereço:* ${empresa.endereco}\n\n`;
    }

    if (empresa?.telefone_dono) {
        msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n\n`;
    }

    msg += `⭐ *Gostou do atendimento?* ⭐\n\n`;
    msg += `🔗 *Agende seu próximo horário:*\n${chatbotLink}\n\n`;
    msg += `---\n_Mensagem automática do See&Agende_`;

    return await send(empresa?.id, cliente.telefone, msg);
}

// ============================================
// EXPORTAR
// ============================================
module.exports = {
    send,
    enviarConfirmacao,
    enviarCancelamento,
    enviarConclusao,
    formatarDataBr,
    formatarTelefone,
    gerarMensagemConfirmacao,
    getInstanciaEmpresa
};