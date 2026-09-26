// ============================================
// SERVIÇO WHATSAPP - VERSÃO CORRIGIDA
// ============================================

const axios = require('axios');
const { getEmpresaDb } = require('../config/database');
const { INSTAGRAM_SISTEMA } = require('../utils/constants');

// ============================================
// CONFIGURAÇÃO
// ============================================
const config = {
    evolution: {
        apiUrl: process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080',
        apiKey: process.env.EVOLUTION_API_KEY || 'seeagende2024',
        defaultInstance: 'seeagende',
    },
    geral: {
        provider: process.env.WHATSAPP_PROVIDER || 'evolution',
        enabled: process.env.WHATSAPP_ENABLED === 'true',
    }
};

const BASE_URL = process.env.BASE_URL || 'https://seeagende.tech';

console.log(`[WHATSAPP] 📱 Provedor configurado: ${config.geral.provider}`);
console.log(`[WHATSAPP] 📱 WhatsApp habilitado: ${config.geral.enabled}`);
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
// MONTA O RODAPÉ COM INSTAGRAMS
// ============================================
function montarRodapeInstagram(empresa) {
    let txt = '';
    
    if (empresa && empresa.instagram) {
        const instaDono = String(empresa.instagram).replace(/^@/, '').trim();
        const instaSistema = INSTAGRAM_SISTEMA ? String(INSTAGRAM_SISTEMA).replace(/^@/, '').trim() : null;
        
        if (instaDono && instaDono.toLowerCase() !== instaSistema?.toLowerCase()) {
            txt += `\n📸 https://instagram.com/${instaDono}`;
        }
    }
    
    if (INSTAGRAM_SISTEMA) {
        txt += `\n💜 https://instagram.com/${INSTAGRAM_SISTEMA}`;
    }
    
    return txt;
}

// ============================================
// GERA SLUG A PARTIR DO NOME DA EMPRESA
// (mesma lógica usada pelo chatbot.routes.js)
// ============================================
function gerarSlug(nome) {
    if (!nome) return '';
    return nome
        .toLowerCase()
        .normalize('NFD')                          // separa acentos
        .replace(/[\u0300-\u036f]/g, '')           // remove acentos
        .replace(/[^\w\s-]/g, '')                  // remove caracteres especiais
        .trim()
        .replace(/\s+/g, '-')                      // espaços → hífen
        .replace(/-+/g, '-');                      // hífens duplicados → 1
}

// ============================================
// MONTA O LINK DO CHATBOT (com slug se possível)
// ============================================
function montarLinkChatbot(empresa) {
    if (!empresa) return `${BASE_URL}/chatbot`;

    // 1) Se já vier um slug pronto, usa
    if (empresa.slug) {
        return `${BASE_URL}/chatbot/${empresa.slug}`;
    }

    // 2) Se tiver nome, gera o slug
    if (empresa.nome) {
        const slug = gerarSlug(empresa.nome);
        if (slug) {
            return `${BASE_URL}/chatbot/${slug}`;
        }
    }

    // 3) Fallback: formato antigo com ID
    return `${BASE_URL}/chatbot.html?empresa=${empresa.id || 1}`;
}

// ============================================
// FUNÇÃO PARA OBTER INSTÂNCIA DA EMPRESA
// ============================================
async function getInstanciaEmpresa(empresaId) {
    if (!empresaId) return config.evolution.defaultInstance;

    try {
        const { db } = require('../config/database');

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
// ENVIAR MENSAGEM - CORRIGIDO
// ============================================
async function send(empresaId, numero, mensagem) {
    console.log(`[WHATSAPP] 🔍 send() chamado:`);
    console.log(`[WHATSAPP]    empresaId: ${empresaId}`);
    console.log(`[WHATSAPP]    numero: ${numero}`);
    console.log(`[WHATSAPP]    mensagem length: ${mensagem?.length || 0}`);
    console.log(`[WHATSAPP]    enabled: ${config.geral.enabled}`);

    if (!config.geral.enabled) {
        console.log('[WHATSAPP] ❌ WhatsApp DESABILITADO no .env');
        return { success: false, error: 'WhatsApp desabilitado' };
    }

    if (!numero) {
        console.log('[WHATSAPP] ❌ Número não fornecido');
        return { success: false, error: 'Número não fornecido' };
    }

    if (!mensagem) {
        console.log('[WHATSAPP] ❌ Mensagem vazia');
        return { success: false, error: 'Mensagem vazia' };
    }

    try {
        const instanceName = await getInstanciaEmpresa(empresaId);
        const finalNumber = formatNumber(numero);
        const url = `${config.evolution.apiUrl}/message/sendText/${instanceName}`;

        console.log(`[WHATSAPP] 📤 Enviando para ${finalNumber} via ${instanceName}`);
        console.log(`[WHATSAPP] 📤 URL: ${url}`);

        const payload = {
            number: finalNumber,
            text: mensagem,
            delay: 1200
        };

        console.log(`[WHATSAPP] 📤 Payload:`, JSON.stringify(payload, null, 2));

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolution.apiKey
            },
            timeout: 30000
        });

        console.log(`[WHATSAPP] ✅ Mensagem enviada com sucesso para ${finalNumber}`);
        console.log(`[WHATSAPP] ✅ Resposta:`, response.data);
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
// ENVIAR CONFIRMAÇÃO
// ============================================
async function enviarConfirmacao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    console.log('[WHATSAPP] 📝 enviarConfirmacao chamado');
    console.log('[WHATSAPP]    Cliente:', cliente?.nome);
    console.log('[WHATSAPP]    Telefone:', cliente?.telefone);

    if (!cliente?.telefone) {
        console.log('[WHATSAPP] ⚠️ Cliente sem telefone');
        return { success: false, error: 'Sem telefone' };
    }

    const chatbotLink = montarLinkChatbot(empresa);

    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'See&Agende';
    const servicoNome = servico?.nome || 'Serviço';
    const dataFormatada = formatarDataBr(data);
    const profissionalNome = profissional?.nome || 'Não definido';

    let msg = `✅ *AGENDAMENTO CONFIRMADO!*\n\n`;
    msg += `Olá *${cliente.nome}*, seu agendamento foi confirmado!\n\n`;
    msg += `📋 *Resumo:*\n`;
    msg += `📅 Data: ${dataFormatada}\n`;
    msg += `⏰ Horário: ${hora}\n`;
    msg += `👨‍💼 Profissional: ${profissionalNome}\n`;
    msg += `✂️ Serviço: ${servicoNome}\n`;
    msg += `💰 Valor: R$ ${valorFormatado}\n\n`;
    msg += `📍 ${nomeEmpresa}\n`;
    msg += `📞 ${empresa?.telefone_dono || '(11) 99999-9999'}\n`;
    msg += montarRodapeInstagram(empresa) + `\n\n`;
    msg += `🔔 Você receberá um lembrete próximo ao horário.\n`;
    msg += `Obrigado por escolher a ${nomeEmpresa}! ✨\n\n`;
    msg += `🔗 ${chatbotLink}`;

    console.log('[WHATSAPP] 📤 Mensagem:', msg.substring(0, 200) + '...');

    return await send(empresa?.id, cliente.telefone, msg);
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
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    console.log('[WHATSAPP] 📝 Enviando conclusão para:', cliente?.nome);

    if (!cliente?.telefone) {
        console.log('[WHATSAPP] ⚠️ Cliente sem telefone');
        return { success: false, error: 'Sem telefone' };
    }

    let valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const nomeEmpresa = empresa?.nome || 'See&Agende';
    const servicoNome = servico?.nome || 'Serviço';
    const chatbotLink = montarLinkChatbot(empresa);

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

    if (empresa?.telefone_dono) {
        msg += `📞 *Contato:* ${formatarTelefone(empresa.telefone_dono)}\n`;
    }
    msg += montarRodapeInstagram(empresa) + `\n\n`;
    msg += `⭐ *Gostou do atendimento?* ⭐\n\n`;
    msg += `🔗 *Agende seu próximo horário:*\n${chatbotLink}\n\n`;
    msg += `---\n_Mensagem automática do See&Agende_`;

    return await send(empresa?.id, cliente.telefone, msg);
}

// ============================================
// ENVIAR LEMBRETE (24H ANTES) - AGORA COM INSTAGRAM
// ============================================
async function enviarLembrete(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    console.log('[WHATSAPP] 📅 enviarLembrete chamado');
    console.log('[WHATSAPP]    Cliente:', cliente?.nome);
    console.log('[WHATSAPP]    Telefone:', cliente?.telefone);

    if (!cliente?.telefone) {
        console.log('[WHATSAPP] ⚠️ Cliente sem telefone');
        return { success: false, error: 'Sem telefone' };
    }

    const chatbotLink = montarLinkChatbot(empresa);
    const nomeEmpresa = empresa?.nome || 'See&Agende';
    const servicoNome = servico?.nome || 'Serviço';
    const dataFormatada = formatarDataBr(data);
    const profissionalNome = profissional?.nome || 'Não definido';

    let msg = `🔔 *LEMBRETE DE AGENDAMENTO*\n\n`;
    msg += `Olá *${cliente.nome}*! Passando pra lembrar do seu horário amanhã:\n\n`;
    msg += `📋 *Detalhes:*\n`;
    msg += `📅 Data: ${dataFormatada}\n`;
    msg += `⏰ Horário: ${hora}\n`;
    msg += `✂️ Serviço: ${servicoNome}\n`;
    msg += `👨‍💼 Profissional: ${profissionalNome}\n\n`;
    msg += `📌 *${nomeEmpresa}*\n`;
    if (empresa?.telefone_dono) {
        msg += `📞 ${formatarTelefone(empresa.telefone_dono)}\n`;
    }
    msg += montarRodapeInstagram(empresa) + `\n\n`;
    msg += `❓ Se não puder comparecer, avise com antecedência.\n`;
    msg += `🔗 Remarcar: ${chatbotLink}`;

    console.log('[WHATSAPP] 📤 Enviando lembrete...');
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
    enviarLembrete,
    formatarDataBr,
    formatarTelefone,
    getInstanciaEmpresa,
    gerarSlug,
    montarLinkChatbot,
    montarRodapeInstagram
};