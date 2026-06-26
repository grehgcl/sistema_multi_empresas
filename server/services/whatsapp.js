// server/services/whatsapp.js
const config = require('../config/whatsapp');
const wppconnect = require('./wppconnect-local');

console.log('[WHATSAPP] 📱 Provedor configurado:', config.geral.provider);

async function send(telefone, mensagem) {
    console.log(`📱 [WHATSAPP] Enviando para ${telefone}`);

    if (!config.geral.enabled) {
        console.log('📱 [WHATSAPP] ⛔ Desabilitado - Modo LOG');
        console.log(`📱 [WHATSAPP] 💬 Mensagem seria enviada para ${telefone}: ${mensagem}`);
        return { success: true, mode: 'log' };
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
        console.log(`📱 [WHATSAPP] ⚠️ Telefone inválido: ${telefone}`);
        return { success: false, error: 'Telefone inválido' };
    }

    // 🔥 WPPCONNECT
    if (config.geral.provider === 'wppconnect') {
        return wppconnect.sendMessage(telefoneLimpo, mensagem);
    }

    // ... resto do código
}

// ============================================
// FUNÇÃO PRINCIPAL DE ENVIO
// ============================================
async function send(telefone, mensagem) {
    console.log(`📱 [WHATSAPP] Enviando para ${telefone}:`, mensagem);

    if (!config.geral.enabled) {
        console.log('📱 [WHATSAPP] ⛔ Desabilitado - Modo LOG');
        console.log(`📱 [WHATSAPP] 💬 Mensagem seria enviada para ${telefone}: ${mensagem}`);
        return { success: true, mode: 'log' };
    }

    // Formatar telefone
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
        console.log(`📱 [WHATSAPP] ⚠️ Telefone inválido: ${telefone}`);
        return { success: false, error: 'Telefone inválido' };
    }

    // Se for WATI
    if (config.geral.provider === 'wati') {
        return sendWati(telefoneLimpo, mensagem);
    }

    // Se for Evolution
    if (config.geral.provider === 'evolution') {
        return sendEvolution(telefoneLimpo, mensagem);
    }

    // Se for WPPConnect
    if (config.geral.provider === 'wppconnect') {
        return sendWppConnect(telefoneLimpo, mensagem);
    }

    console.log(`📱 [WHATSAPP] ⚠️ Provedor desconhecido: ${config.geral.provider}`);
    return { success: false, error: 'Provedor desconhecido' };
}

// ============================================
// WATI - MENSAGEM DIRETA (SEM TEMPLATE)
// ============================================
async function sendWati(telefone, mensagem) {
    console.log(`📱 [WATI] Enviando para ${telefone}`);

    try {
        // 🔥 USAR API DE MENSAGEM DIRETA
        const url = `${config.wati.apiUrl}/api/v1/sendMessage`;

        const body = {
            phoneNumber: telefone,
            text: mensagem
        };

        console.log(`📱 [WATI] URL: ${url}`);
        console.log(`📱 [WATI] Body:`, JSON.stringify(body, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.wati.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // Pegar resposta como texto primeiro
        const text = await response.text();
        console.log(`📱 [WATI] Resposta raw (${response.status}):`, text);

        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('❌ [WATI] Resposta não é JSON:', text);
            // Se a resposta for HTML ou erro, tentar extrair mensagem
            if (text.includes('<!DOCTYPE')) {
                return {
                    success: false,
                    error: 'Erro na autenticação WATI - Verifique a chave da API',
                    raw: text.substring(0, 200)
                };
            }
            return { success: false, error: 'Resposta inválida da API', raw: text };
        }

        if (response.ok) {
            console.log(`✅ [WATI] Mensagem enviada com sucesso!`);
            return { success: true, result };
        } else {
            console.log(`❌ [WATI] Erro:`, result);
            return { success: false, error: result };
        }
    } catch (error) {
        console.error('❌ [WATI] Erro:', error.message);
        return { success: false, error: error.message };
    }
}
// ============================================
// EVOLUTION API
// ============================================
// No arquivo server/services/whatsapp.js, verifique se a função sendEvolution está assim:

async function sendEvolution(telefone, mensagem) {
    console.log(`📱 [EVOLUTION] Enviando para ${telefone}`);

    try {
        const url = `${config.evolution.apiUrl}/message/sendText/${config.evolution.instance}`;

        const body = {
            number: telefone,
            text: mensagem
        };

        console.log(`📱 [EVOLUTION] URL: ${url}`);
        console.log(`📱 [EVOLUTION] Body:`, body);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': config.evolution.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log(`📱 [EVOLUTION] Resposta:`, result);

        if (response.ok) {
            return { success: true, result };
        } else {
            return { success: false, error: result };
        }
    } catch (error) {
        console.error('❌ [EVOLUTION] Erro:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// WPPCONNECT
// ============================================
async function sendWppConnect(telefone, mensagem) {
    console.log(`📱 [WPPCONNECT] Enviando para ${telefone}`);

    try {
        const url = `${config.wppconnect.apiUrl}/api/wppconnect/send`;

        const body = {
            phone: telefone,
            message: mensagem
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.wppconnect.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log(`📱 [WPPCONNECT] Resposta:`, result);

        if (response.ok) {
            return { success: true, result };
        } else {
            return { success: false, error: result };
        }
    } catch (error) {
        console.error('❌ [WPPCONNECT] Erro:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNÇÕES ESPECÍFICAS
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, profissional, data, hora, empresa } = dados;

    const mensagem = `✅ *Agendamento Confirmado!*\n\n` +
        `Olá *${cliente.nome || 'Cliente'}*! Seu agendamento foi confirmado.\n\n` +
        `📅 *Data:* ${formatarDataBr(data)}\n` +
        `⏰ *Hora:* ${hora}\n` +
        `✂️ *Serviço:* ${servico.nome}\n` +
        `💰 *Valor:* R$ ${servico.valor.toFixed(2)}\n` +
        `${profissional ? `👨‍💼 *Profissional:* ${profissional.nome}\n` : ''}` +
        `🏪 *Empresa:* ${empresa.nome}\n\n` +
        `_Esta é uma mensagem automática._`;

    return send(cliente.telefone, mensagem);
}

async function enviarNovoAgendamentoProfissional(dados) {
    const { cliente, servico, profissional, data, hora, empresa } = dados;

    if (!profissional?.telefone) {
        console.log('📱 [WHATSAPP] Profissional sem telefone');
        return;
    }

    const mensagem = `🔔 *Novo Agendamento Atribuído!*\n\n` +
        `Olá *${profissional.nome}*! Um novo agendamento foi atribuído a você.\n\n` +
        `👤 *Cliente:* ${cliente.nome}\n` +
        `📅 *Data:* ${formatarDataBr(data)}\n` +
        `⏰ *Hora:* ${hora}\n` +
        `✂️ *Serviço:* ${servico.nome}\n` +
        `💰 *Valor:* R$ ${servico.valor.toFixed(2)}\n\n` +
        `_Esta é uma mensagem automática._`;

    return send(profissional.telefone, mensagem);
}

async function enviarLembrete(dados) {
    const { cliente, servico, data, hora, empresa } = dados;

    const mensagem = `🔔 *Lembrete de Agendamento!*\n\n` +
        `Olá *${cliente.nome}*! Seu agendamento está chegando.\n\n` +
        `📅 *Data:* ${formatarDataBr(data)}\n` +
        `⏰ *Hora:* ${hora}\n` +
        `✂️ *Serviço:* ${servico.nome}\n` +
        `🏪 *Empresa:* ${empresa.nome}\n\n` +
        `_Esta é uma mensagem automática._`;

    return send(cliente.telefone, mensagem);
}

async function enviarCancelamento(dados) {
    const { cliente, servico, data, hora, empresa } = dados;

    const mensagem = `❌ *Agendamento Cancelado!*\n\n` +
        `Olá *${cliente.nome}*! Seu agendamento foi cancelado.\n\n` +
        `📅 *Data:* ${formatarDataBr(data)}\n` +
        `⏰ *Hora:* ${hora}\n` +
        `✂️ *Serviço:* ${servico.nome}\n\n` +
        `_Esta é uma mensagem automática._`;

    return send(cliente.telefone, mensagem);
}

// ============================================
// AUXILIARES
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    if (typeof dataStr === 'string' && dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const partes = dataStr.split('-');
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
}

// ============================================
// EXPORTAR
// ============================================
module.exports = {
    send,
    enviarConfirmacao,
    enviarNovoAgendamentoProfissional,
    enviarLembrete,
    enviarCancelamento,
    config
};

console.log('[WHATSAPP] ✅ Serviço inicializado');