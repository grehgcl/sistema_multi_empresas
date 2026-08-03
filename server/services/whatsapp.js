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

// 🔥 BASE URL PARA LINKS (prioriza a URL da VPS)
const BASE_URL = process.env.BASE_URL || process.env.APP_URL || 'https://seeagende.com.br';

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
// 🔥 GERAR SLUG DA EMPRESA
// ============================================
function gerarSlug(nome) {
    if (!nome) return '';
    return nome.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ============================================
// 🔥 BUSCAR INSTÂNCIA DA EMPRESA
// ============================================
async function getInstanciaEmpresa(empresaId) {
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
            try {
                await axios.get(`${config.evolution.apiUrl}/instance/connectionState/${empresa.whatsapp_instance}`, {
                    headers: { 'apikey': config.evolution.apiKey },
                    timeout: 5000
                });

                instanceName = empresa.whatsapp_instance;
                isOwn = true;
                console.log(`[WHATSAPP] 📱 Usando instância própria: ${instanceName}`);
            } catch (e) {
                console.log(`[WHATSAPP] ⚠️ Instância própria ${empresa.whatsapp_instance} indisponível. Usando fallback.`);
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

        if (isOwn && instanceName !== config.evolution.defaultInstance) {
            console.log(`🔄 Tentando fallback urgente para instância padrão ${config.evolution.defaultInstance}...`);
            return enviarEvolution(null, numero, mensagem);
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
// 🔥 GERAR MENSAGEM DE CONFIRMAÇÃO (COM MAPS E COMO CHEGAR)
// ============================================
function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink) {
    // 🔥 PEGAR O VALOR CORRETO
    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'nossa empresa';

    // 🔥 LINK DO CHATBOT (usa BASE_URL)
    if (!chatbotLink) {
        const slug = gerarSlug(nomeEmpresa);
        chatbotLink = `${BASE_URL}/chatbot.html?empresa=${slug || empresa?.id || '1'}`;
    }

    // 🔥 GERAR LINK DO GOOGLE MAPS
    const enderecoCompleto = empresa?.endereco || '';
    let mapsLink = '';
    let wazeLink = '';
    if (enderecoCompleto) {
        const enderecoEncoded = encodeURIComponent(enderecoCompleto);
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`;
        wazeLink = `https://waze.com/ul?q=${enderecoEncoded}&navigate=yes`;
    }

    // 🔥 GERAR LINK DO WHATSAPP DO DONO
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

    // 🔥 ENDEREÇO COM "COMO CHEGAR"
    if (empresa?.endereco) {
        msg += `📍 *Endereço:* ${empresa.endereco}\n\n`;
        msg += `🚗 *COMO CHEGAR:*\n`;
        if (mapsLink) {
            msg += `🗺️ *Abrir no Google Maps:* ${mapsLink}\n`;
        }
        if (wazeLink) {
            msg += `🚗 *Abrir no Waze:* ${wazeLink}\n`;
        }
        msg += `\n`;
    }

    // 🔥 CONTATO
    if (empresa?.telefone_dono) {
        msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n`;
        if (whatsappLink) {
            msg += `💬 *Falar no WhatsApp:* ${whatsappLink}\n`;
        }
        msg += `\n`;
    }

    msg += `💡 *Dica:* Chegue 10 minutos antes!\n\n`;
    msg += `🔗 *Agende novamente:*\n${chatbotLink}\n\n`;
    msg += `---\n_Mensagem automática do See&Agende_`;

    return msg;
}

// ============================================
// 🔥 ENVIAR CONFIRMAÇÃO
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    const slug = gerarSlug(empresa?.nome);
    const chatbotLink = `${BASE_URL}/chatbot.html?empresa=${slug || empresa?.id || '1'}`;

    const mensagem = gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink);
    return await send(empresa?.id, cliente.telefone, mensagem);
}

// ============================================
// 🔥 ENVIAR NOVO AGENDAMENTO PARA PROFISSIONAL
// ============================================
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

// ============================================
// 🔥 ENVIAR CANCELAMENTO
// ============================================
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

// ============================================
// 🔥 ENVIAR CONCLUSÃO (COM VALOR CORRETO E LINK)
// ============================================
async function enviarConclusao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    // 🔥 VALOR CORRETO (prioriza valor_total, depois valor, depois valor do serviço)
    let valor = 0;
    if (dados.valor_total && parseFloat(dados.valor_total) > 0) {
        valor = parseFloat(dados.valor_total);
    } else if (dados.valor && parseFloat(dados.valor) > 0) {
        valor = parseFloat(dados.valor);
    } else if (servico?.valor && parseFloat(servico.valor) > 0) {
        valor = parseFloat(servico.valor);
    }
    const valorFormatado = valor.toFixed(2).replace('.', ',');

    // 🔥 LINK DO CHATBOT (usa BASE_URL)
    const slug = gerarSlug(empresa?.nome);
    const chatbotLink = `${BASE_URL}/chatbot.html?empresa=${slug || empresa?.id || '1'}`;

    // 🔥 GERAR LINK DO GOOGLE MAPS
    const enderecoCompleto = empresa?.endereco || '';
    let mapsLink = '';
    if (enderecoCompleto) {
        const enderecoEncoded = encodeURIComponent(enderecoCompleto);
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`;
    }

    // 🔥 WHATSAPP DO DONO
    let whatsappLink = '';
    if (empresa?.telefone_dono) {
        const telLimpo = empresa.telefone_dono.replace(/\D/g, '');
        whatsappLink = `https://wa.me/55${telLimpo}`;
    }

    let msg = `✅ *Atendimento Concluído!* 🎉\n\n`;
    msg += `Olá *${cliente?.nome}*!\n`;
    msg += `Obrigado por escolher a *${empresa?.nome || 'nossa empresa'}*!\n\n`;
    msg += `📋 *RESUMO DO SERVIÇO:*\n`;
    msg += `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n`;
    msg += `💰 Valor: *R$ ${valorFormatado}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}* às *${hora}*\n\n`;

    if (profissional?.nome) {
        msg += `👤 Profissional: *${profissional.nome}*\n\n`;
    }

    // 🔥 ENDEREÇO
    if (empresa?.endereco) {
        msg += `📍 *Endereço:* ${empresa.endereco}\n`;
        if (mapsLink) {
            msg += `🗺️ *Como chegar:* ${mapsLink}\n`;
        }
        msg += `\n`;
    }

    // 🔥 CONTATO
    if (empresa?.telefone_dono) {
        msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n`;
        if (whatsappLink) {
            msg += `💬 *WhatsApp:* ${whatsappLink}\n`;
        }
        msg += `\n`;
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
    enviarNovoAgendamentoProfissional,
    enviarCancelamento,
    enviarConclusao,
    formatarDataBr,
    formatarTelefone,
    gerarMensagemConfirmacao,
    enviarMensagem: send
};