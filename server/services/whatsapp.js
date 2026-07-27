// ============================================
// SERVIÇO WHATSAPP - EVOLUTION API (MULTI-INSTÂNCIA COM FALLBACK)
// ============================================

const axios = require('axios');
const { db } = require('../config/database');  // ✅ Importa só o objeto db

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
// 🔥 BUSCAR INSTÂNCIA DA EMPRESA (COM CONTROLE DO SUPER ADMIN)
// ============================================
function getInstanciaEmpresa(empresaId) {
    return new Promise((resolve) => {
        try {
            const isPg = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

            // 🔥 NOVO: Buscar também whatsapp_proprio_habilitado e plano
            const sql = isPg
                ? 'SELECT whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado, plano FROM empresas WHERE id = $1'
                : 'SELECT whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado, plano FROM empresas WHERE id = ?';

            db.get(sql, [empresaId], (err, empresa) => {
                if (err) {
                    console.error('[WHATSAPP] Erro ao buscar instância:', err.message);
                    return resolve({
                        instanceName: config.evolution.instance,
                        connected: true,
                        isOwn: false
                    });
                }

                // 🔥 VERIFICAÇÃO EM 3 CAMADAS:
                // 1. Super Admin habilitou? (whatsapp_proprio_habilitado)
                // 2. Empresa tem instância criada? (whatsapp_instance)
                // 3. Instância está conectada? (whatsapp_connected)

                const superAdminHabilitou = empresa?.whatsapp_proprio_habilitado === true ||
                    empresa?.whatsapp_proprio_habilitado === 1 ||
                    empresa?.whatsapp_proprio_habilitado === 't';

                const temInstancia = empresa?.whatsapp_instance;
                const estaConectada = empresa?.whatsapp_connected === true ||
                    empresa?.whatsapp_connected === 1 ||
                    empresa?.whatsapp_connected === 't';

                if (superAdminHabilitou && temInstancia && estaConectada) {
                    console.log(`[WHATSAPP] ✅ Usando instância PRÓPRIA: ${empresa.whatsapp_instance} (plano: ${empresa.plano})`);
                    return resolve({
                        instanceName: empresa.whatsapp_instance,
                        connected: true,
                        isOwn: true
                    });
                }

                // Log detalhado do motivo do fallback
                if (superAdminHabilitou && temInstancia && !estaConectada) {
                    console.log(`[WHATSAPP] ⚠️ Instância ${temInstancia} existe mas NÃO está conectada`);
                } else if (superAdminHabilitou && !temInstancia) {
                    console.log(`[WHATSAPP] ⚠️ Super Admin habilitou mas empresa não criou instância ainda`);
                } else if (!superAdminHabilitou) {
                    console.log(`[WHATSAPP] ⚠️ WhatsApp próprio NÃO habilitado pelo Super Admin (plano: ${empresa?.plano})`);
                }

                // Fallback para instância padrão
                resolve({
                    instanceName: config.evolution.instance,
                    connected: true,
                    isOwn: false
                });
            });
        } catch (error) {
            console.error('[WHATSAPP] Erro crítico:', error);
            resolve({
                instanceName: config.evolution.instance,
                connected: true,
                isOwn: false
            });
        }
    });
}

// ============================================
// 🔥 ENVIAR MENSAGEM VIA EVOLUTION API (MULTI-INSTÂNCIA) - CORRIGIDO
// ============================================
async function enviarEvolution(empresaId, numero, mensagem) {
    try {
        // Busca instância (própria OU padrão)
        const instancia = await getInstanciaEmpresa(empresaId);

        const url = `${config.evolution.apiUrl}/message/sendText/${instancia.instanceName}`;

        console.log('🔍 Número original recebido:', numero);

        // 🔥 LIMPA O NÚMERO (remove tudo que não é dígito)
        const numeroLimpo = String(numero).replace(/\D/g, '');
        console.log('🔍 Número limpo (sem caracteres):', numeroLimpo);
        console.log('🔍 Tamanho do número limpo:', numeroLimpo.length);

        // 🔥 CORREÇÃO: SEMPRE ADICIONA 55 SE NÃO TIVER
        let numeroFinal = numeroLimpo;
        if (!numeroFinal.startsWith('55')) {
            numeroFinal = '55' + numeroFinal;
        }

        // 🔥 SE TIVER 11 DÍGITOS (55 + DDD + 8 sem 9), PODE FALTAR O 9
        // Exemplo: 55419003903 (11 dígitos) - falta o 9 após o DDD
        // O correto seria 554199003903 (12 dígitos) - com o 9
        // Mas a Evolution API pode aceitar ambos, vamos manter como está

        console.log('🔍 Número final (enviado):', numeroFinal);
        console.log('🔍 Tamanho do número final:', numeroFinal.length);

        const payload = {
            number: numeroFinal,
            text: mensagem,
            delay: 1,
        };

        console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
        console.log(`📡 Tentando enviar via URL: ${url}`);

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolution.apiKey,
            },
            timeout: 30000,
        });

        console.log(`📱 WhatsApp: Mensagem enviada para ${numeroFinal} via ${instancia.isOwn ? '🆕 INSTÂNCIA PRÓPRIA' : '📌 INSTÂNCIA PADRÃO'} (${instancia.instanceName})`);
        return { success: true, data: response.data };

    } catch (error) {
        console.error(`❌ Erro ao enviar WhatsApp (Evolution):`, error.message);

        if (error.response) {
            console.log('📡 Resposta da API (Erro):', JSON.stringify(error.response.data, null, 2));

            // 🔥 TENTA FORMATO ALTERNATIVO SE O ERRO FOR 400
            if (error.response.status === 400) {
                const numeroLimpo = String(numero).replace(/\D/g, '');

                // 🔥 TENTA SEM O 55
                if (numeroLimpo.startsWith('55')) {
                    const sem55 = numeroLimpo.substring(2);
                    console.log(`🔄 Tentando formato alternativo (sem 55): ${sem55}`);
                    try {
                        const payload2 = {
                            number: sem55,
                            text: mensagem,
                            delay: 1,
                        };
                        const response2 = await axios.post(url, payload2, {
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': config.evolution.apiKey,
                            },
                            timeout: 30000,
                        });
                        console.log(`✅ Mensagem enviada com formato alternativo (sem 55)!`);
                        return { success: true, data: response2.data };
                    } catch (e) {
                        console.log('❌ Formato alternativo também falhou');
                    }
                }

                // 🔥 TENTA COM 9 (se não tiver)
                if (numeroLimpo.length === 11 && numeroLimpo.startsWith('55')) {
                    const com9 = numeroLimpo.substring(0, 4) + '9' + numeroLimpo.substring(4);
                    console.log(`🔄 Tentando formato alternativo (com 9): ${com9}`);
                    try {
                        const payload3 = {
                            number: com9,
                            text: mensagem,
                            delay: 1,
                        };
                        const response3 = await axios.post(url, payload3, {
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': config.evolution.apiKey,
                            },
                            timeout: 30000,
                        });
                        console.log(`✅ Mensagem enviada com formato alternativo (com 9)!`);
                        return { success: true, data: response3.data };
                    } catch (e) {
                        console.log('❌ Formato com 9 também falhou');
                    }
                }
            }
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
// 🔥 FUNÇÃO PRINCIPAL: ENVIAR MENSAGEM
// ============================================
async function send(empresaId, numero, mensagem) {
    if (!config.geral.enabled) {
        console.log(`[WHATSAPP] ⚠️ WhatsApp desabilitado (WHATSAPP_ENABLED=false)`);
        return { success: false, error: 'WhatsApp desabilitado' };
    }

    if (!numero) {
        console.log(`[WHATSAPP] ⚠️ Número não fornecido`);
        return { success: false, error: 'Número não fornecido' };
    }

    if (config.geral.provider === 'evolution') {
        return await enviarEvolution(empresaId, numero, mensagem);
    } else {
        return enviarLog(numero, mensagem);
    }
}

// ============================================
// GERAR MENSAGEM DE CONFIRMAÇÃO - COM LINK CLICÁVEL
// ============================================
function gerarMensagemConfirmacao(cliente, servico, data, hora, profissional, empresa, chatbotLink) {
    let valor = 0;
    if (servico && servico.valor !== undefined && servico.valor !== null) {
        valor = parseFloat(servico.valor) || 0;
    }
    const valorFormatado = valor.toFixed(2).replace('.', ',');

    const telefoneDono = empresa?.telefone_dono || '';
    const telefoneDonoFormatado = formatarTelefone(telefoneDono);
    const endereco = empresa?.endereco || '';

    const nomeEmpresa = empresa?.nome || 'nossa empresa';
    const nomeCliente = cliente?.nome || 'Cliente';

    // 🔥 SE NÃO TIVER LINK, CRIA UM
    if (!chatbotLink) {
        const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
        const slugEmpresa = nomeEmpresa
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const identificador = slugEmpresa || empresa?.id || '1';
        chatbotLink = `${baseUrl}/chatbot.html?empresa=${identificador}`;
    }

    let mensagem = `🌟 *See&Agende - Sua Agenda Inteligente*\n\n` +
        `Olá *${nomeCliente}*! Seu agendamento foi confirmado com sucesso! ✅\n\n` +
        `📋 *DETALHES DO AGENDAMENTO:*\n` +
        `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n` +
        `💰 Valor: *R$ ${valorFormatado}*\n\n`;

    if (profissional?.nome) {
        mensagem += `👤 Profissional: *${profissional.nome}*\n\n`;
    }

    if (endereco && endereco.trim() !== '') {
        mensagem += `📍 *Endereço:* ${endereco}\n\n`;
    }

    if (telefoneDonoFormatado) {
        mensagem += `📞 *Dúvidas? Entre em contato:* ${telefoneDonoFormatado}\n\n`;
    }

    mensagem += `💡 *Dicas:*\n` +
        `• Chegue com 10 minutos de antecedência\n` +
        `• Em caso de imprevisto, entre em contato\n\n` +
        `🔗 *Agende seu próximo horário:*\n${chatbotLink}\n\n` + // ← LINK EM LINHA SEPARADA
        `🙏 Agradecemos por ter escolhido a *${nomeEmpresa}*!\n` +
        `_Esta é uma mensagem automática do See&Agende._`;

    return mensagem;
}

// ============================================
// 🔥 ENVIAR CONFIRMAÇÃO - COM LINK PERSONALIZADO
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

    // ✅ NOME DA EMPRESA PARA PERSONALIZAÇÃO
    const nomeEmpresa = empresa?.nome || 'nossa empresa';

    // 🔥 CRIA O LINK PERSONALIZADO
    const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
    const slugEmpresa = nomeEmpresa
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const identificador = slugEmpresa || empresa?.id || '1';
    const chatbotLink = `${baseUrl}/chatbot.html?empresa=${identificador}`;

    const mensagem = gerarMensagemConfirmacao(cliente, servicoComValor, data, hora, profissional, empresa, chatbotLink);

    console.log(`📱 WhatsApp - Dados recebidos:`, {
        empresa_id: empresa?.id,
        empresa_nome: empresa?.nome,
        cliente: cliente?.nome,
        servico: servico?.nome
    });

    return await send(empresa?.id, cliente.telefone, mensagem);
}

// ============================================
// 🔥 ENVIAR NOTIFICAÇÃO PROFISSIONAL
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

    return await send(empresa?.id, profissional.telefone, mensagem);
}

// ============================================
// 🔥 ENVIAR CANCELAMENTO
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

    return await send(empresa?.id, cliente.telefone, mensagem);
}

// ============================================
// 🔥 ENVIAR CONCLUSÃO - COM LINK CLICÁVEL
// ============================================
async function enviarConclusao(dados) {
    const { cliente, servico, data, hora, profissional, empresa } = dados;

    if (!cliente?.telefone) {
        console.log(`[WHATSAPP] ⚠️ Cliente sem telefone, não enviando conclusão`);
        return { success: false, error: 'Cliente sem telefone' };
    }

    const nomeCliente = cliente?.nome || 'Cliente';
    const servicoNome = servico?.nome || 'Serviço';
    const telefoneDono = empresa?.telefone_dono || '';
    const telefoneDonoFormatado = formatarTelefone(telefoneDono);

    const nomeEmpresa = empresa?.nome || 'nossa empresa';

    // 🔥 CRIA O LINK PERSONALIZADO
    const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
    const slugEmpresa = nomeEmpresa
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const identificador = slugEmpresa || empresa?.id || '1';
    const chatbotLink = `${baseUrl}/chatbot.html?empresa=${identificador}`;

    const valor = parseFloat(servico?.valor) || 0;
    const valorFormatado = valor.toFixed(2).replace('.', ',');

    // ✅ MENSAGEM COM LINK CLICÁVEL (em linha separada)
    let mensagem = `🌟 *See&Agende - Sua Agenda Inteligente*\n\n` +
        `✅ *Atendimento Concluído!*\n\n` +
        `Olá *${nomeCliente}*! Seu atendimento foi concluído com sucesso. 😊\n\n` +
        `📋 *Resumo do Atendimento:*\n` +
        `✂️ Serviço: *${servicoNome}*\n` +
        `📅 Data: *${formatarDataBr(data)}*\n` +
        `⏰ Hora: *${hora}*\n` +
        `💰 Valor: *R$ ${valorFormatado}*\n\n`;

    if (telefoneDonoFormatado) {
        mensagem += `📞 *Dúvidas? Entre em contato:* ${telefoneDonoFormatado}\n\n`;
    }

    mensagem += `🌟 *Já pensou em agendar seu próximo atendimento?*\n` +
        `Agende pelo nosso chatbot! 🤖\n\n` +
        `🔗 *Link do Chatbot:*\n${chatbotLink}\n\n` + // ← LINK EM LINHA SEPARADA
        `🙏 Agradecemos por ter escolhido a *${nomeEmpresa}*!\n` +
        `_Esta é uma mensagem automática do See&Agende._`;

    return await send(empresa?.id, cliente.telefone, mensagem);
}

// ============================================
// EXPORTAR FUNÇÕES
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