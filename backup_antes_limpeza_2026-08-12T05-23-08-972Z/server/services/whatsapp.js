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

// 🔥 BASE_URL - usa a URL da VPS ou .env
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
// 🔥 GERAR LINK DO CHATBOT (USA O ID DA EMPRESA)
// ============================================
function gerarLinkChatbot(empresa) {
    const id = empresa?.id || '1';
    // 🔥 USA O ID EM VEZ DO SLUG
    return `${BASE_URL}/chatbot.html?empresa=${id}`;
}

// ============================================
// 🔥 GERAR MENSAGEM DE CONFIRMAÇÃO (COM "COMO CHEGAR")
// ============================================
function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink) {
    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'nossa empresa';

    if (!chatbotLink) {
        chatbotLink = gerarLinkChatbot(empresa);
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

    // 🔥 "COMO CHEGAR" NA CONFIRMAÇÃO
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
// 🔥 ENVIAR CONFIRMAÇÃO
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;
    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    const chatbotLink = gerarLinkChatbot(empresa);
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
// 🔥 ENVIAR CONCLUSÃO
// ============================================
async function enviarConclusao(dados) {
    const { cliente, servico, data, hora, profissional, empresa, agendamento_id } = dados;

    console.log('[WHATSAPP] 📝 Dados recebidos para conclusão:', {
        cliente: cliente?.nome,
        servico: servico?.nome,
        valor_servico: servico?.valor,
        agendamento_id: agendamento_id
    });

    if (!cliente?.telefone) return { success: false, error: 'Sem telefone' };

    // 🔥 BUSCAR VALOR DO BANCO se não veio nos dados
    let valor = 0;
    let servicoNome = servico?.nome || 'Serviço';

    if (servico?.valor && parseFloat(servico.valor) > 0) {
        valor = parseFloat(servico.valor);
        console.log(`[WHATSAPP] 💰 Valor do serviço: R$ ${valor}`);
    } else if (agendamento_id) {
        try {
            const sql = process.env.NODE_ENV === 'production'
                ? `SELECT a.valor, a.valor_total, s.nome as servico_nome, s.valor as servico_valor
                   FROM agendamentos a
                   LEFT JOIN servicos s ON a.servico_id = s.id
                   WHERE a.id = $1 AND a.empresa_id = $2`
                : `SELECT a.valor, a.valor_total, s.nome as servico_nome, s.valor as servico_valor
                   FROM agendamentos a
                   LEFT JOIN servicos s ON a.servico_id = s.id
                   WHERE a.id = ? AND a.empresa_id = ?`;

            const row = await new Promise((resolve, reject) => {
                db.get(sql, [agendamento_id, empresa?.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (row) {
                if (row.valor_total && parseFloat(row.valor_total) > 0) {
                    valor = parseFloat(row.valor_total);
                } else if (row.valor && parseFloat(row.valor) > 0) {
                    valor = parseFloat(row.valor);
                } else if (row.servico_valor && parseFloat(row.servico_valor) > 0) {
                    valor = parseFloat(row.servico_valor);
                }
                if (row.servico_nome) servicoNome = row.servico_nome;
                console.log(`[WHATSAPP] 💰 Valor do banco: R$ ${valor}`);
            }
        } catch (err) {
            console.error('[WHATSAPP] ❌ Erro ao buscar valor do banco:', err.message);
        }
    }

    const valorFormatado = valor.toFixed(2).replace('.', ',');
    console.log(`[WHATSAPP] 💰 Valor final: R$ ${valorFormatado}`);

    const chatbotLink = gerarLinkChatbot(empresa);

    const enderecoCompleto = empresa?.endereco || '';
    let mapsLink = '';
    if (enderecoCompleto) {
        const enderecoEncoded = encodeURIComponent(enderecoCompleto);
        mapsLink = `https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`;
    }

    let whatsappLink = '';
    if (empresa?.telefone_dono) {
        const telLimpo = empresa.telefone_dono.replace(/\D/g, '');
        whatsappLink = `https://wa.me/55${telLimpo}`;
    }

    let msg = `✅ *Atendimento Concluído!* 🎉\n\n`;
    msg += `Olá *${cliente?.nome}*!\n`;
    msg += `Obrigado por escolher a *${empresa?.nome || 'nossa empresa'}*!\n\n`;
    msg += `📋 *RESUMO DO SERVIÇO:*\n`;
    msg += `✂️ Serviço: *${servicoNome}*\n`;
    msg += `💰 Valor: *R$ ${valorFormatado}*\n`;
    msg += `📅 Data: *${formatarDataBr(data)}* às *${hora}*\n\n`;

    if (profissional?.nome) {
        msg += `👤 Profissional: *${profissional.nome}*\n\n`;
    }

    if (empresa?.endereco) {
        msg += `📍 *Endereço:* ${empresa.endereco}\n`;
        if (mapsLink) msg += `🗺️ *Como chegar:* ${mapsLink}\n`;
        msg += `\n`;
    }

    if (empresa?.telefone_dono) {
        msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n`;
        if (whatsappLink) msg += `💬 *WhatsApp:* ${whatsappLink}\n`;
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