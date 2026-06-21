// server/services/whatsapp.js
const axios = require('axios');
const config = require('../config/whatsapp');

class WhatsAppService {
    constructor() {
        this.provider = config.geral.provider;
        this.enabled = config.geral.enabled;
        console.log(`[WHATSAPP] 📱 Provedor configurado: ${this.provider}`);
    }

    // ============================================
    // FORMATAÇÃO DE NÚMERO
    // ============================================
    formatPhone(phone) {
        if (!phone) return '';
        // Remove tudo que não é número
        let clean = phone.replace(/\D/g, '');

        // Se não tiver 55, adiciona
        if (!clean.startsWith('55')) {
            clean = `55${clean}`;
        }

        return clean;
    }

    // ============================================
    // ENVIO VIA WATI (VERSÃO CORRIGIDA)
    // ============================================
    async sendWati(phone, message, templateName = null, templateParams = {}) {
        const formattedPhone = this.formatPhone(phone);

        // TESTAR DIFERENTES URLS
        const baseUrl = config.wati.apiUrl || 'https://live-mt-server.wati.io';

        // Opção 1: Tentar com /api/v1
        let url = `${baseUrl}/api/v1/sendTextMessage`;

        console.log(`[WATI] 📤 Enviando para ${formattedPhone}...`);
        console.log(`[WATI] 🔗 URL: ${url}`);

        const payload = {
            to: formattedPhone,
            text: message,
        };

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
            console.error('[WATI] ❌ Erro:');
            if (error.response) {
                console.error(`[WATI] Status: ${error.response.status}`);
                console.error(`[WATI] Data:`, error.response.data);

                // Se falhar, tentar URL alternativa
                if (error.response.status === 404) {
                    console.log('[WATI] 🔄 Tentando URL alternativa...');
                    try {
                        // Tentar sem /api/v1
                        const altUrl = `${baseUrl}/sendTextMessage`;
                        console.log(`[WATI] 🔗 URL Alternativa: ${altUrl}`);

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
            } else {
                console.error(`[WATI] ${error.message}`);
            }
            return { success: false, error: error.response?.data || error.message };
        }
    }
    // ============================================
    // ENVIO VIA EVOLUTION API
    // ============================================
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

    // ============================================
    // ENVIO VIA WPPCONNECT LOCAL (CORRIGIDO)
    // ============================================
    async sendWppConnect(phone, message) {
        try {
            // Importa o módulo local
            const { enviarMensagem } = require('./wppconnect-local');
            return await enviarMensagem(phone, message);
        } catch (error) {
            console.error('[WPPCONNECT] ❌ Erro ao carregar módulo local:', error.message);

            // Fallback: tenta o servidor Docker
            const formattedPhone = this.formatPhone(phone);
            const url = `${config.wppconnect.apiUrl}/send-text`;

            try {
                console.log(`[WPPCONNECT] 📤 Tentando servidor Docker para ${formattedPhone}...`);

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
                console.error('[WPPCONNECT] ❌ Erro ao enviar via Docker:');
                if (dockerError.response) {
                    console.error(`[WPPCONNECT] Status: ${dockerError.response.status}`);
                    console.error(`[WPPCONNECT] Data:`, dockerError.response.data);
                } else {
                    console.error(`[WPPCONNECT] ${dockerError.message}`);
                }
                return { success: false, error: dockerError.response?.data || dockerError.message };
            }
        }
    }

    // ============================================
    // MÉTODO PRINCIPAL DE ENVIO
    // ============================================
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
            // Fallback: log apenas
            console.log(`[WHATSAPP] 📝 Mensagem (${this.provider}) para ${phone}: ${message}`);
            return { success: true, data: { message: 'Mensagem logada' } };
        }
    }

    // ============================================
    // TEMPLATES PRONTOS
    // ============================================

    async enviarLembrete(agendamento) {
        const { cliente, servico, data, hora, profissional, empresa } = agendamento;

        const mensagem = `🔔 *SEE&AGENDE - Lembrete de Agendamento*\n\n` +
            `Olá *${cliente.nome}*! 👋\n\n` +
            `Seu agendamento para *${servico.nome}* está marcado para:\n` +
            `📅 *${data}* às *${hora}*\n` +
            `👤 Profissional: *${profissional?.nome || 'Não definido'}*\n\n` +
            `📍 *${empresa.nome}*\n` +
            `${empresa.endereco || ''}\n\n` +
            `Qualquer dúvida, entre em contato conosco! 📞\n\n` +
            `_Esta é uma mensagem automática._`;

        return await this.send(cliente.telefone, mensagem);
    }

    async enviarConfirmacao(agendamento) {
        const { cliente, servico, data, hora, profissional, empresa } = agendamento;

        const mensagem = `✅ *Agendamento Confirmado!*\n\n` +
            `Olá *${cliente.nome}*! Seu agendamento foi confirmado:\n\n` +
            `✂️ Serviço: *${servico.nome}*\n` +
            `📅 Data: *${data}*\n` +
            `⏰ Hora: *${hora}*\n` +
            `👤 Profissional: *${profissional?.nome || 'Não definido'}*\n\n` +
            `📍 *${empresa.nome}*\n` +
            `${empresa.endereco || ''}\n\n` +
            `Te esperamos! 🎉\n\n` +
            `_Esta é uma mensagem automática._`;

        return await this.send(cliente.telefone, mensagem);
    }

    async enviarCancelamento(agendamento) {
        const { cliente, servico, data, hora, empresa } = agendamento;

        const mensagem = `❌ *Agendamento Cancelado*\n\n` +
            `Olá *${cliente.nome}*,\n\n` +
            `Seu agendamento para *${servico.nome}* no dia *${data}* às *${hora}* foi *CANCELADO*.\n\n` +
            `Caso queira remarcar, entre em contato conosco! 📞\n\n` +
            `_Esta é uma mensagem automática._`;

        return await this.send(cliente.telefone, mensagem);
    }

    async enviarNovoAgendamentoProfissional(agendamento) {
        const { cliente, servico, data, hora, profissional, empresa } = agendamento;

        if (!profissional?.telefone) {
            return { success: false, error: 'Profissional sem telefone' };
        }

        const mensagem = `📋 *Novo Agendamento Atribuído*\n\n` +
            `Olá *${profissional.nome}*! Você tem um novo agendamento:\n\n` +
            `👤 Cliente: *${cliente.nome}*\n` +
            `✂️ Serviço: *${servico.nome}*\n` +
            `📅 Data: *${data}*\n` +
            `⏰ Hora: *${hora}*\n\n` +
            `📍 *${empresa.nome}*\n\n` +
            `Bom atendimento! 💈`;

        return await this.send(profissional.telefone, mensagem);
    }
}

// Singleton
const whatsappService = new WhatsAppService();
module.exports = whatsappService;