// ============================================
// SERVIÇO WHATSAPP - EVOLUTION API
// ============================================

const axios = require('axios');

// ============================================
// FUNÇÃO AUXILIAR: FORMATAR DATA BR
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
        }
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            return data.toLocaleDateString('pt-BR');
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

// ============================================
// FUNÇÃO AUXILIAR: FORMATAR TELEFONE
// ============================================
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

// ============================================
// CONFIGURAÇÃO
// ============================================
const config = {
    evolution: {
        apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
        apiKey: process.env.EVOLUTION_API_KEY || '',
        instance: process.env.EVOLUTION_INSTANCE || 'seeagende',
    },
    geral: {
        provider: process.env.WHATSAPP_PROVIDER || 'log',
        enabled: process.env.WHATSAPP_ENABLED === 'true',
    }
};

console.log(`[WHATSAPP] 📱 Provedor configurado: ${config.geral.provider}`);

// ============================================
// ENVIAR MENSAGEM VIA EVOLUTION API
// ============================================
async function enviarEvolution(numero, mensagem) {
    try {
        const url = `${config.evolution.apiUrl}/message/sendText/${config.evolution.instance}`;

        // Formatar número (remover tudo que não é dígito)
        const numeroLimpo = numero.replace(/\D/g, '');
        // Adicionar 55 se não tiver código do país
        const numeroFinal = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;

        const payload = {
            number: numeroFinal,
            text: mensagem,
            delay: 1,
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolution.apiKey,
            },
            timeout: 10000,
        });

        console.log(`📱 WhatsApp: Mensagem enviada para ${numero} (Evolution)`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ Erro ao enviar WhatsApp (Evolution):`, error.message);
        if (error.response) {
            console.error('📡 Resposta da API:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// ENVIAR MENSAGEM (MODO LOG - SIMULAÇÃO)
// ============================================
function enviarLog(numero, mensagem) {
    console.log(`[WHATSAPP] 📱 Provedor: log`);
    console.log(`[WHATSAPP] 📞 Telefone original: ${numero}`);
    console.log(`[WHATSAPP] 📝 Mensagem (log) para ${numero}:`);
    console.log(`┌${'─'.repeat(50)}┐`);
    console.log(mensagem);
    console.log(`└${'─'.repeat(50)}┘`);
    return { success: true };
}

// ============================================
// FUNÇÃO PRINCIPAL: ENVIAR MENSAGEM
// ============================================
async function send(numero, mensagem) {
    if (!config.geral.enabled) {
        console.log(`[WHATSAPP] ⚠️ WhatsApp desabilitado (WHATSAPP_ENABLED=false)`);
        return { success: false, error: 'WhatsApp desabilitado' };
    }

    if (!numero) {
        console.log(`[WHATSAPP] ⚠️ Número não fornecido`);
        return { success: false, error: 'Número não fornecido' };
    }

    if (config.geral.provider === 'evolution') {
        return await enviarEvolution(numero, mensagem);
    } else {
        return enviarLog(numero, mensagem);
    }
}

// ============================================
// GERAR MENSAGEM DE CONFIRMAÇÃO
// ============================================
function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa) {
    let mensagem = `🌟 *See&Agende - Sua Agenda Inteligente*\n\n` +
        `Olá *${cliente?.nome || 'Cliente'}*! Seu agendamento foi confirmado com sucesso! ✅\n\n` +
        `📋 *DETALHES DO AGENDAMENTO:*\n` +
        `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n` +
        `💰 Valor: *R$ ${(servico?.valor || 0).toFixed(2).replace('.', ',')}*\n\n`;

    if (profissional?.nome) {
        mensagem += `👤 Profissional: *${profissional.nome}*\n\n`;
    }

    if (empresa?.endereco) {
        mensagem += `📍 *${empresa.nome || 'Estabelecimento'}*\n`;
        mensagem += `${empresa.endereco}\n\n`;
    }

    if (empresa?.telefone_dono) {
        const telefoneFormatado = formatarTelefone(empresa.telefone_dono);
        mensagem += `📞 Contato: ${telefoneFormatado}\n\n`;
    }

    mensagem += `💡 *Dicas:*\n` +
        `• Chegue com 10 minutos de antecedência\n` +
        `• Em caso de imprevisto, entre em contato\n\n` +
        `🙏 Agradecemos pela preferência!\n` +
        `_Esta é uma mensagem automática do See&Agende._`;

    return mensagem;
}

// ============================================
// ENVIAR CONFIRMAÇÃO DE AGENDAMENTO
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    if (!cliente?.telefone) {
        console.log(`[WHATSAPP] ⚠️ Cliente sem telefone, não enviando mensagem`);
        return { success: false, error: 'Cliente sem telefone' };
    }

    const mensagem = gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa);

    console.log(`📱 WhatsApp - Dados recebidos:`, {
        empresa_nome: empresa?.nome,
        telefone_dono: empresa?.telefone_dono,
        endereco: empresa?.endereco,
        cliente: cliente?.nome,
        servico: servico?.nome,
    });

    return await send(cliente.telefone, mensagem);
}

// ============================================
// ENVIAR NOTIFICAÇÃO PARA PROFISSIONAL
// ============================================
async function enviarNovoAgendamentoProfissional(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    if (!profissional?.telefone) {
        console.log(`[WHATSAPP] ⚠️ Profissional sem telefone, não enviando mensagem`);
        return { success: false, error: 'Profissional sem telefone' };
    }

    const mensagem = `📢 *Novo Agendamento!*\n\n` +
        `Olá *${profissional.nome}*! Você tem um novo agendamento:\n\n` +
        `👤 Cliente: *${cliente?.nome || 'Cliente'}*\n` +
        `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n` +
        (empresa?.telefone_dono ? `📞 Contato: ${formatarTelefone(empresa.telefone_dono)}\n` : '') +
        `\n🙏 Prepare-se para atender!`;

    return await send(profissional.telefone, mensagem);
}

// ============================================
// ENVIAR CANCELAMENTO
// ============================================
async function enviarCancelamento(dados) {
    const { cliente, servico, data, hora, empresa } = dados;

    if (!cliente?.telefone) {
        console.log(`[WHATSAPP] ⚠️ Cliente sem telefone, não enviando cancelamento`);
        return { success: false, error: 'Cliente sem telefone' };
    }

    const mensagem = `⚠️ *Agendamento Cancelado*\n\n` +
        `Olá *${cliente?.nome || 'Cliente'}*! Seu agendamento foi cancelado:\n\n` +
        `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n\n` +
        (empresa?.nome ? `🏢 ${empresa.nome}\n` : '') +
        (empresa?.telefone_dono ? `📞 Contato: ${formatarTelefone(empresa.telefone_dono)}\n\n` : '') +
        `Estamos à disposição para um novo agendamento! 😊\n` +
        `_Esta é uma mensagem automática do See&Agende._`;

    return await send(cliente.telefone, mensagem);
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
module.exports = {
    send,
    enviarConfirmacao,
    enviarNovoAgendamentoProfissional,
    enviarCancelamento,
    formatarDataBr,
    formatarTelefone,
    gerarMensagemConfirmacao,
};