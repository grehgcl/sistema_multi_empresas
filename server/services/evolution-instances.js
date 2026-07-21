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
            console.log(`🔍 Buscando QR Code para: ${instanceName}`);

            // ✅ ENDPOINT CORRETO E ÚNICO PARA EVOLUTION API v2
            const response = await api.get(`/instance/connect/${instanceName}`);

            const qrData = response.data?.qrcode;
            const qrCode = qrData?.base64 || qrData || response.data?.base64;
            const pairingCode = response.data?.pairingCode;
            const instanceState = response.data?.instance?.state || response.data?.state;

            // 1. Se já estiver conectada, avisa o frontend para parar de pedir QR Code
            if (instanceState === 'open' || instanceState === 'connected') {
                return {
                    success: true,
                    alreadyConnected: true,
                    message: 'WhatsApp já está conectado!'
                };
            }

            // 2. Se tiver QR Code, retorna para o frontend
            if (qrCode || pairingCode) {
                console.log(`✅ QR Code obtido com sucesso`);
                return {
                    success: true,
                    qrCode: qrCode,
                    pairingCode: pairingCode,
                    data: response.data
                };
            }

            // 3. Se não tiver QR Code ainda (instância iniciando)
            return {
                success: false,
                message: 'QR Code não disponível. Aguarde a instância iniciar.',
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao buscar QR Code:', error.response?.data || error.message);

            // 4. SE DER 404, significa que a instância JÁ ESTÁ CONECTADA e a API negou o QR
            if (error.response?.status === 404) {
                return {
                    success: true, // Retorna true para o frontend saber que está tudo ok
                    alreadyConnected: true,
                    message: 'Instância já está conectada.'
                };
            }

            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar QR Code'
            };
        }
    }
    static async getStatus(instanceName) {
        try {
            console.log(`🔍 Verificando status da instância: ${instanceName}`);

            // ✅ ENDPOINT CORRETO EVOLUTION V2 PARA STATUS
            const response = await api.get(`/instance/connectionState/${instanceName}`);

            // A Evolution V2 retorna "open" para conectado e "close" para desconectado
            const state = response.data?.instance?.state || response.data?.state || 'disconnected';
            const isConnected = state === 'open' || state === 'connected' || state === 'CONNECTED';

            console.log(`📊 Status real da Evolution: ${state} (Nosso sistema entende como Connected: ${isConnected})`);

            return {
                success: true,
                state: state,
                connected: isConnected,
                data: response.data
            };
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`⚠️ Instância ${instanceName} não encontrada`);
                return { success: false, state: 'not_found', connected: false };
            }
            console.error('❌ Erro ao verificar status:', error.response?.data || error.message);
            return { success: false, state: 'disconnected', connected: false };
        }
    }

    static async disconnect(instanceName) {
        try {
            // ✅ ENDPOINT CORRETO: /instance/{instanceName}/disconnect
            console.log(`🔌 Desconectando instância: ${instanceName}`);
            const response = await api.post(`/instance/${instanceName}/disconnect`);
            console.log(`✅ Instância desconectada`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Erro ao desconectar' };
        }
    }

    static async logout(instanceName) {
        return this.disconnect(instanceName);
    }

    static async enviarMensagem(instanceName, numero, mensagem) {
        try {
            // ✅ CORREÇÃO PARA EVOLUTION API v2:
            console.log(`📤 [ENVIANDO] Instância: ${instanceName} | Número: ${numero}`);

            const response = await api.post(`/message/sendText/${instanceName}`, {
                number: numero,
                text: mensagem,
                delay: 1
            });

            console.log(`✅ [SUCESSO] Mensagem enviada via ${instanceName}`);
            return { success: true, data: response.data };

        } catch (error) {
            console.error(`❌ [ERRO] ${instanceName}:`, error.response?.data || error.message);

            if (error.response?.status === 404) {
                console.log(`⚠️ Instância ${instanceName} não encontrada ou endpoint incorreto`);
                return {
                    success: false,
                    message: 'Instância não encontrada',
                    fallback: true
                };
            }

            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.log(`⏰ Timeout na instância ${instanceName}`);
                return {
                    success: false,
                    message: 'Timeout - Instância não respondeu',
                    timeout: true
                };
            }

            return { success: false, message: 'Falha ao enviar mensagem' };
        }
    }

    static async isConnected(instanceName) {
        try {
            const status = await this.getStatus(instanceName);
            return status.connected === true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = EvolutionInstances;