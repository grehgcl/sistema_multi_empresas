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

        const numeroLimpo = numero.replace(/\D/g, '');
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
// GERAR MENSAGEM DE CONFIRMAÇÃO - CORRIGIDA
// ============================================
function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa) {
    // 🔥 CONVERTER VALOR PARA NÚMERO COM SEGURANÇA
    let valor = 0;
    if (servico && servico.valor !== undefined && servico.valor !== null) {
        valor = parseFloat(servico.valor) || 0;
    }
    const valorFormatado = valor.toFixed(2).replace('.', ',');

    const telefoneDono = empresa?.telefone_dono || '';
    const telefoneDonoFormatado = formatarTelefone(telefoneDono);
    const endereco = empresa?.endereco || 'não informado';
    const nomeEmpresa = empresa?.nome || 'See&Agende';

    let mensagem = `🌟 *${nomeEmpresa} - Sua Agenda Inteligente*\n\n` +
        `Olá *${cliente?.nome || 'Cliente'}*! Seu agendamento foi confirmado com sucesso! ✅\n\n` +
        `📋 *DETALHES DO AGENDAMENTO:*\n` +
        `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n` +
        `💰 Valor: *R$ ${valorFormatado}*\n\n`;

    if (profissional?.nome) {
        mensagem += `👤 Profissional: *${profissional.nome}*\n\n`;
    }

    if (endereco && endereco !== 'não informado') {
        mensagem += `📍 *${nomeEmpresa}*\n`;
        mensagem += `${endereco}\n\n`;
    }

    if (telefoneDonoFormatado) {
        mensagem += `📞 Contato: ${telefoneDonoFormatado}\n\n`;
    }

    mensagem += `💡 *Dicas:*\n` +
        `• Chegue com 10 minutos de antecedência\n` +
        `• Em caso de imprevisto, entre em contato\n\n` +
        `🙏 Agradecemos pela preferência!\n` +
        `_Esta é uma mensagem automática do See&Agende._`;

    return mensagem;
}

// ============================================
// ENVIAR CONFIRMAÇÃO DE AGENDAMENTO - CORRIGIDA
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    if (!cliente?.telefone) {
        console.log(`[WHATSAPP] ⚠️ Cliente sem telefone, não enviando mensagem`);
        return { success: false, error: 'Cliente sem telefone' };
    }

    const servicoComValor = {
        ...servico,
        valor: parseFloat(servico?.valor) || 0
    };

    const mensagem = gerarMensagemConfirmacao(cliente, servicoComValor, data, hora, profissional, empresa);

    console.log(`📱 WhatsApp - Dados recebidos:`, {
        empresa_nome: empresa?.nome,
        telefone_dono: empresa?.telefone_dono,
        endereco: empresa?.endereco,
        cliente: cliente?.nome,
        servico: servico?.nome,
        valor: servicoComValor.valor
    });

    return await send(cliente.telefone, mensagem);
}

// ============================================
// ENVIAR NOTIFICAÇÃO PARA PROFISSIONAL - CORRIGIDA
// ============================================
async function enviarNovoAgendamentoProfissional(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    if (!profissional?.telefone) {
        console.log(`[WHATSAPP] ⚠️ Profissional sem telefone, não enviando mensagem`);
        return { success: false, error: 'Profissional sem telefone' };
    }

    const valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');

    const telefoneDono = empresa?.telefone_dono || '';
    const telefoneDonoFormatado = formatarTelefone(telefoneDono);

    const mensagem = `📢 *Novo Agendamento!*\n\n` +
        `Olá *${profissional.nome}*! Você tem um novo agendamento:\n\n` +
        `👤 Cliente: *${cliente?.nome || 'Cliente'}*\n` +
        `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
        `💰 Valor: *R$ ${valorFormatado}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n` +
        (telefoneDonoFormatado ? `📞 Contato: ${telefoneDonoFormatado}\n` : '') +
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