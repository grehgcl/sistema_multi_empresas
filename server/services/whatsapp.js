// server/services/whatsapp.js
const axios = require('axios');
const config = require('../config/whatsapp');

class WhatsAppService {
    constructor() {
        this.provider = config.geral.provider;
        this.enabled = config.geral.enabled;
        console.log(`[WHATSAPP] 📱 Provedor configurado: ${this.provider}`);
    }

    formatPhone(phone) {
        if (!phone) return '';
        let clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) {
            clean = `55${clean}`;
        }
        return clean;
    }

    // 🔥 FUNÇÃO NOVA: FORMATAR TELEFONE PARA EXIBIÇÃO
    formatarTelefoneParaExibicao(telefone) {
        if (!telefone) return '';
        const clean = telefone.replace(/\D/g, '');
        if (clean.length === 11) {
            return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
        } else if (clean.length === 10) {
            return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
        }
        return telefone;
    }

    async sendWati(phone, message, templateName = null, templateParams = {}) {
        const formattedPhone = this.formatPhone(phone);
        const baseUrl = config.wati.apiUrl || 'https://live-mt-server.wati.io';
        let url = `${baseUrl}/api/v1/sendTextMessage`;
        const payload = { to: formattedPhone, text: message };
        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${config.wati.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });
            console.log(`[WATI] ✅ Mensagem enviada para ${formattedPhone}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('[WATI] ❌ Erro:', error.response?.data || error.message);
            if (error.response?.status === 404) {
                try {
                    const altUrl = `${baseUrl}/sendTextMessage`;
                    const altResponse = await axios.post(altUrl, payload, {
                        headers: {
                            'Authorization': `Bearer ${config.wati.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 15000,
                    });
                    console.log(`[WATI] ✅ Mensagem enviada via URL alternativa!`);
                    return { success: true, data: altResponse.data };
                } catch (altError) {
                    console.error('[WATI] ❌ URL alternativa também falhou');
                }
            }
            return { success: false, error: error.response?.data || error.message };
        }
    }

    async sendEvolution(phone, message) {
        const formattedPhone = this.formatPhone(phone);
        const url = `${config.evolution.apiUrl}/message/sendText/${config.evolution.instance}`;
        try {
            const response = await axios.post(url, {
                number: formattedPhone,
                text: message,
            }, {
                headers: {
                    'apikey': config.evolution.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            console.log(`[EVOLUTION] ✅ Mensagem enviada para ${formattedPhone}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('[EVOLUTION] ❌ Erro:', error.response?.data || error.message);
            return { success: false, error: error.response?.data || error.message };
        }
    }

    async sendWppConnect(phone, message) {
        try {
            const { enviarMensagem } = require('./wppconnect-local');
            return await enviarMensagem(phone, message);
        } catch (error) {
            console.error('[WPPCONNECT] ❌ Erro ao carregar módulo local:', error.message);
            const formattedPhone = this.formatPhone(phone);
            const url = `${config.wppconnect.apiUrl}/send-text`;
            try {
                const response = await axios.post(url, {
                    phone: formattedPhone,
                    message: message,
                }, {
                    headers: {
                        'Authorization': `Bearer ${config.wppconnect.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                });
                console.log(`[WPPCONNECT] ✅ Mensagem enviada via Docker para ${formattedPhone}`);
                return { success: true, data: response.data };
            } catch (dockerError) {
                console.error('[WPPCONNECT] ❌ Erro ao enviar via Docker:', dockerError.response?.data || dockerError.message);
                return { success: false, error: dockerError.response?.data || dockerError.message };
            }
        }
    }

    async send(phone, message, options = {}) {
        if (!this.enabled) {
            console.log('[WHATSAPP] ⛔ Desabilitado');
            return { success: false, error: 'WhatsApp desabilitado' };
        }
        if (!phone) {
            console.log('[WHATSAPP] ⛔ Telefone não informado');
            return { success: false, error: 'Telefone não informado' };
        }
        console.log(`[WHATSAPP] 📱 Provedor: ${this.provider}`);
        console.log(`[WHATSAPP] 📞 Telefone original: ${phone}`);

        const { templateName, templateParams = {} } = options;

        if (this.provider === 'wati') {
            return await this.sendWati(phone, message, templateName, templateParams);
        } else if (this.provider === 'evolution') {
            return await this.sendEvolution(phone, message);
        } else if (this.provider === 'wppconnect') {
            return await this.sendWppConnect(phone, message);
        } else {
            console.log(`[WHATSAPP] 📝 Mensagem (${this.provider}) para ${phone}: ${message}`);
            return { success: true, data: { message: 'Mensagem logada' } };
        }
    }

    // ============================================
    // 🔥 TEMPLATES ATUALIZADOS COM TELEFONE DO DONO
    // ============================================

    async enviarConfirmacao(agendamento) {
        const { cliente, servico, data, hora, profissional, empresa } = agendamento;

        console.log('📱 WhatsApp - Dados recebidos:', {
            empresa_nome: empresa?.nome,
            telefone_dono: empresa?.telefone_dono,
            endereco: empresa?.endereco,
            cliente: cliente?.nome,
            servico: servico?.nome
        });
        // 🔥 FORMATAR TELEFONE DO DONO
        const telefoneDono = empresa?.telefone_dono || '';
        const telefoneDonoFormatado = this.formatarTelefoneParaExibicao(telefoneDono);

        // 🔥 ENDEREÇO
        const endereco = empresa?.endereco || '';
        let enderecoCompleto = `📍 *${empresa?.nome || 'Estabelecimento'}*`;
        if (endereco) {
            enderecoCompleto += `\n${endereco}`;
        }

        // 🔥 MENSAGEM
        let mensagem = `✅ *Agendamento Confirmado!*\n\n` +
            `Olá *${cliente?.nome || 'Cliente'}*! Seu agendamento foi confirmado:\n\n` +
            `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
            `📅 Data: *${data}*\n` +
            `⏰ Hora: *${hora}*\n`;

        if (profissional?.nome) {
            mensagem += `👤 Profissional: *${profissional.nome}*\n\n`;
        } else {
            mensagem += '\n';
        }

        mensagem += `${enderecoCompleto}\n\n`;

        // 🔥 TELEFONE DO DONO
        if (telefoneDonoFormatado) {
            mensagem += `📞 *Dúvidas? Entre em contato conosco pelo contato:*\n` +
                `📱 ${telefoneDonoFormatado}\n\n`;
        }

        mensagem += `_Esta é uma mensagem automática._`;

        return await this.send(cliente?.telefone, mensagem);
    }

    async enviarLembrete(agendamento) {
        const { cliente, servico, data, hora, profissional, empresa } = agendamento;

        const telefoneDono = empresa?.telefone_dono || '';
        const telefoneDonoFormatado = this.formatarTelefoneParaExibicao(telefoneDono);

        const endereco = empresa?.endereco || '';
        let enderecoCompleto = `📍 *${empresa?.nome || 'Estabelecimento'}*`;
        if (endereco) {
            enderecoCompleto += `\n${endereco}`;
        }

        let mensagem = `🔔 *SEE&AGENDE - Lembrete de Agendamento*\n\n` +
            `Olá *${cliente?.nome || 'Cliente'}*! 👋\n\n` +
            `Seu agendamento para *${servico?.nome || 'Serviço'}* está marcado para:\n` +
            `📅 *${data}* às *${hora}*\n` +
            `👤 Profissional: *${profissional?.nome || 'Não definido'}*\n\n` +
            `${enderecoCompleto}\n\n`;

        if (telefoneDonoFormatado) {
            mensagem += `📞 *Dúvidas? Entre em contato com o dono:*\n` +
                `📱 ${telefoneDonoFormatado}\n\n`;
        }

        mensagem += `_Esta é uma mensagem automática._`;

        return await this.send(cliente?.telefone, mensagem);
    }

    async enviarCancelamento(agendamento) {
        const { cliente, servico, data, hora, empresa } = agendamento;

        const telefoneDono = empresa?.telefone_dono || '';
        const telefoneDonoFormatado = this.formatarTelefoneParaExibicao(telefoneDono);

        let mensagem = `❌ *Agendamento Cancelado*\n\n` +
            `Olá *${cliente?.nome || 'Cliente'}*,\n\n` +
            `Seu agendamento para *${servico?.nome || 'Serviço'}* no dia *${data}* às *${hora}* foi *CANCELADO*.\n\n`;

        if (telefoneDonoFormatado) {
            mensagem += `📞 Para remarcar ou tirar dúvidas, entre em contato com o dono:\n` +
                `📱 ${telefoneDonoFormatado}\n\n`;
        } else {
            mensagem += `Caso queira remarcar, entre em contato conosco! 📞\n\n`;
        }

        mensagem += `_Esta é uma mensagem automática._`;

        return await this.send(cliente?.telefone, mensagem);
    }

    async enviarNovoAgendamentoProfissional(agendamento) {
        const { cliente, servico, data, hora, profissional, empresa } = agendamento;

        if (!profissional?.telefone) {
            return { success: false, error: 'Profissional sem telefone' };
        }

        const mensagem = `📋 *Novo Agendamento Atribuído*\n\n` +
            `Olá *${profissional.nome}*! Você tem um novo agendamento:\n\n` +
            `👤 Cliente: *${cliente?.nome || 'Cliente'}*\n` +
            `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
            `📅 Data: *${data}*\n` +
            `⏰ Hora: *${hora}*\n\n` +
            `📍 *${empresa?.nome || 'Estabelecimento'}*\n\n` +
            `Bom atendimento! 💈`;

        return await this.send(profissional.telefone, mensagem);
    }

    async enviarAgradecimento(agendamento) {
        const { cliente, servico, data, hora, empresa } = agendamento;

        const telefoneDono = empresa?.telefone_dono || '';
        const telefoneDonoFormatado = this.formatarTelefoneParaExibicao(telefoneDono);

        let mensagem = `✨ *Atendimento Concluído!*\n\n` +
            `Olá *${cliente?.nome || 'Cliente'}*! Seu atendimento foi concluído com sucesso. ✅\n\n` +
            `✂️ Serviço: *${servico?.nome || 'Serviço'}*\n` +
            `📅 Data: *${data}*\n` +
            `⏰ Hora: *${hora}*\n\n` +
            `Agradecemos pela preferência! 🙏\n\n`;

        if (telefoneDonoFormatado) {
            mensagem += `📞 *Dúvidas ou sugestões? Entre em contato com o dono:*\n` +
                `📱 ${telefoneDonoFormatado}\n\n`;
        }

        mensagem += `Já pensou em agendar seu próximo atendimento? Agende pelo nosso chatbot! 🤖\n\n` +
            `_Esta é uma mensagem automática._`;

        return await this.send(cliente?.telefone, mensagem);
    }
}

module.exports = new WhatsAppService();