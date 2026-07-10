const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

const api = axios.create({
    baseURL: EVOLUTION_URL,
    headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
    timeout: 30000
});

class EvolutionInstances {

    static gerarNomeInstancia(empresaId, empresaNome) {
        const slug = empresaNome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 20);
        return `emp-${empresaId}-${slug}`;
    }

    static async criarInstancia(empresaId, empresaNome) {
        const instanceName = this.gerarNomeInstancia(empresaId, empresaNome);

        try {
            const response = await api.post('/instance/create', {
                instanceName,
                integration: 'WHATSAPP-BAILEYS',
                qrcode: true,
                rejectCall: true,
                groupsIgnore: true,
                alwaysOnline: true,
                readMessages: false,
                readStatus: false
            });

            return { success: true, instanceName, data: response.data };
        } catch (error) {
            console.error('Erro ao criar instância:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Erro ao criar instância' };
        }
    }

    static async getQrCode(instanceName) {
        try {
            const response = await api.get(`/instance/connect/${instanceName}`);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, message: 'Erro ao buscar QR Code' };
        }
    }

    static async getStatus(instanceName) {
        try {
            const response = await api.get(`/instance/connectionState/${instanceName}`);
            return { success: true, state: response.data?.instance?.state };
        } catch (error) {
            return { success: false, state: 'disconnected' };
        }
    }

    static async logout(instanceName) {
        try {
            await api.delete(`/instance/logout/${instanceName}`);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    static async enviarMensagem(instanceName, numero, mensagem) {
        try {
            const response = await api.post(`/message/sendText/${instanceName}`, {
                number: numero,
                text: mensagem
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`Erro ao enviar (${instanceName}):`, error.response?.data || error.message);
            return { success: false, message: 'Falha ao enviar mensagem' };
        }
    }
}

module.exports = EvolutionInstances;