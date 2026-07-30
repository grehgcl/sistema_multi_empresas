// ============================================
// SERVIÇO WHATSAPP - EVOLUTION API (MULTI-INSTÂNCIA COM FALLBACK BLINDADO)
// ============================================

const axios = require('axios');
const { db } = require('../config/database');

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

console.log(`[WHATSAPP] 📱 Provedor configurado: ${config.geral.provider}`);

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
// 🔥 BUSCAR INSTÂNCIA DA EMPRESA (LÓGICA INTELIGENTE)
// ============================================
async function getInstanciaEmpresa(empresaId) {
    // Padrão inicial
    let instanceName = config.evolution.defaultInstance;
    let isOwn = false;

    if (!empresaId) return { instanceName, isOwn };

    try {
        const empresa = await new Promise((resolve, reject) => {
            const sql = process.env.NODE_ENV === 'production'
                ? 'SELECT whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado FROM empresas WHERE id = $1'
                : 'SELECT whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado FROM empresas WHERE id = ?';

            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (empresa && empresa.whatsapp_proprio_habilitado && empresa.whatsapp_instance) {
            // Verifica se a instância realmente existe/responde na Evolution antes de usar
            try {
                await axios.get(`${config.evolution.apiUrl}/instance/connectionState/${empresa.whatsapp_instance}`, {
                    headers: { 'apikey': config.evolution.apiKey },
                    timeout: 5000
                });

                // Se chegou aqui, a instância existe na API
                instanceName = empresa.whatsapp_instance;
                isOwn = true;
                console.log(`[WHATSAPP] 📱 Usando instância própria: ${instanceName}`);
            } catch (e) {
                // Se der erro (404 ou timeout), usa a padrão silenciosamente
                console.log(`[WHATSAPP] ⚠️ Instância própria ${empresa.whatsapp_instance} indisponível na Evolution. Usando fallback.`);
            }
        }
    } catch (err) {
        console.error('[WHATSAPP] Erro ao buscar dados da empresa:', err.message);
    }

    return { instanceName, isOwn };
}

// ============================================
// 🔥 ENVIAR MENSAGEM VIA EVOLUTION API
// ============================================
async function enviarEvolution(empresaId, numero, mensagem) {
    const { instanceName, isOwn } = await getInstanciaEmpresa(empresaId);
    const finalNumber = formatNumber(numero);
    const url = `${config.evolution.apiUrl}/message/sendText/${instanceName}`;

    try {
        const response = await axios.post(url, {
            number: finalNumber,
            text: mensagem,
            delay: 1200
        }, {
            headers: { 'Content-Type': 'application/json', 'apikey': config.evolution.apiKey },
            timeout: 30000
        });

        console.log(`✅ Mensagem enviada via ${isOwn ? 'Instância Própria' : 'Padrão'} (${instanceName}) para ${finalNumber}`);
        return { success: true, data: response.data };

    } catch (error) {
        console.error(`❌ Erro ao enviar WhatsApp (${instanceName}):`, error.response?.status || error.message);

        // Fallback de última hora: Se falhou na própria e não era a padrão, tenta na padrão
        if (isOwn && instanceName !== config.evolution.defaultInstance) {
            console.log(`🔄 Tentando fallback urgente para instância padrão ${config.evolution.defaultInstance}...`);
            return enviarEvolution(null, numero, mensagem); // Chama recursivamente usando a padrão
        }

        return { success: false, error: error.message };
    }
}

// ============================================
// ENVIAR MENSAGEM (MODO LOG)
// ============================================
function enviarLog(numero, mensagem) {
    console.log(`[WHATSAPP] 📱 Provedor: log`);
    console.log(`[WHATSAPP] 📝 Mensagem para ${numero}: ${mensagem.substring(0, 50)}...`);
    return { success: true };
}

// ============================================
// 🔥 FUNÇÃO PRINCIPAL: SEND
// ============================================
async function send(empresaId, numero, mensagem) {
    if (!config.geral.enabled) return { success: false, error: 'WhatsApp desabilitado' };
    if (!numero) return { success: false, error: 'Número não fornecido' };

    if (config.geral.provider === 'evolution') {
        return await enviarEvolution(empresaId, numero, mensagem);
    } else {
        return enviarLog(numero, mensagem);
    }
}

// ============================================
// GERAR E ENVIAR MENSAGENS ESPECÍFICAS
// ============================================

function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink) {
    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'nossa empresa';

    // Link padrão se não fornecido
    if (!chatbotLink) {
        const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
        const slug = (nomeEmpresa || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        chatbotLink = `${baseUrl}/chatbot.html?empresa=${slug || empresa?.id || '1'}`;
    }

    let msg = `🌟 *See&Agende - Sua Agenda Inteligente*\n\n`;
    msg += `Olá *${cliente?.nome || 'Cliente'}*! Seu agendamento foi confirmado! ✅\n\n`;
    msg += `📋 *DETALHES:*\n`;
    msg += `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}*\n`;
    msg += `⏰ Hora: *${hora}*\n`;
    msg += `💰 Valor: *R$ ${valorFormatado}*\n\n`;

    if (profissional?.nome) msg += `👤 Profissional: *${profissional.nome}*\n\n`;
    if (empresa?.endereco) msg += `📍 *Endereço:* ${empresa.endereco}\n\n`;
    if (empresa?.telefone_dono) msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n\n`;

    msg += `🔗 *Agende novamente:*\n${chatbotLink}\n\n`;
    msg += `_Mensagem automática See&Agende._`;
    return msg;
}

async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
    const slug = (empresa?.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const chatbotLink = `${baseUrl}/chatbot.html?empresa=${slug || empresa?.id || '1'}`;

    const mensagem = gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink);
    return await send(empresa?.id, cliente.telefone, mensagem);
}

async function enviarNovoAgendamentoProfissional(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!profissional?.telefone) return { success: false, error: 'Profissional sem telefone' };

    const valor = parseFloat(servico?.valor) || 0;
    let msg = `📢 *Novo Agendamento!*\n\n`;
    msg += `Olá *${profissional.nome}*!\n`;
    msg += `👤 Cliente: *${cliente?.nome}*\n`;
    msg += `✂️ Serviço: *${servico?.nome}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}* às *${hora}*\n`;
    msg += `💰 Valor: *R$ ${valor.toFixed(2).replace('.', ',')}*\n`;
    if (empresa?.telefone_dono) msg += `📞 Contato: ${formatarTelefone(empresa.telefone_dono)}`;

    return await send(empresa?.id, profissional.telefone, msg);
}

async function enviarCancelamento(dados) {
    const { cliente, servico, data, hora, empresa } = dados;
    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    let msg = `⚠️ *Agendamento Cancelado*\n\n`;
    msg += `Olá *${cliente?.nome}*!\n`;
    msg += `✂️ Serviço: *${servico?.nome}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}* às *${hora}*\n\n`;
    msg += `Estamos à disposição para remarcar! 😊`;

    return await send(empresa?.id, cliente.telefone, msg);
}

async function enviarConclusao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
    const slug = (empresa?.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const chatbotLink = `${baseUrl}/chatbot.html?empresa=${slug || empresa?.id || '1'}`;
    const valor = parseFloat(servico?.valor) || 0;

    let msg = `✅ *Atendimento Concluído!*\n\n`;
    msg += `Olá *${cliente?.nome}*! Obrigado por escolher a *${empresa?.nome}*.\n\n`;
    msg += `📋 Resumo:\n`;
    msg += `✂️ ${servico?.nome} - R$ ${valor.toFixed(2).replace('.', ',')}\n`;
    msg += `📅 ${formatarDataBr(data)} às ${hora}\n\n`;
    msg += `🔗 *Agende seu próximo horário:*\n${chatbotLink}`;

    return await send(empresa?.id, cliente.telefone, msg);
}

// ============================================
// EXPORTAR
// ============================================
module.exports = {
    send,
    enviarConfirmacao,
    enviarNovoAgendamentoProfissional,
    enviarCancelamento,
    enviarConclusao,
    formatarDataBr,
    formatarTelefone,
    gerarMensagemConfirmacao,
};