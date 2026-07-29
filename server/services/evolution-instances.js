// ============================================
// EVOLUTION-INSTANCES.JS - GESTÃO DE INSTÂNCIAS WHATSAPP
// CORRIGIDO - 30/07/2026
// ============================================

const axios = require('axios');

class EvolutionInstances {

    // ============================================
    // CONFIGURAÇÃO DA API
    // ============================================

    static getApiClient() {
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || 'seeagende2024';

        return axios.create({
            baseURL: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            timeout: 30000
        });
    }

    // ============================================
    // CRIAR INSTÂNCIA
    // ============================================

    static async criarInstancia(instanceName) {
        try {
            const api = this.getApiClient();

            // Primeiro verifica se a instância já existe
            const status = await this.getStatus(instanceName);
            if (status.connected) {
                return {
                    success: true,
                    alreadyExists: true,
                    message: 'Instância já existe e está conectada'
                };
            }

            // Criar nova instância
            const response = await api.post('/instance/create', {
                instanceName: instanceName,
                qrCode: true,
                number: '',
                integration: 'WHATSAPP-BAILEYS'
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao criar instância:', error.message);
            // Se já existe, retorna sucesso
            if (error.response && error.response.status === 400) {
                return {
                    success: true,
                    alreadyExists: true,
                    message: 'Instância já existe'
                };
            }
            return {
                success: false,
                message: error.message || 'Erro ao criar instância'
            };
        }
    }

    // ============================================
    // OBTER QR CODE
    // ============================================

    static async getQrCode(instanceName) {
        try {
            const api = this.getApiClient();

            // Primeiro verifica status
            const status = await this.getStatus(instanceName);
            if (status.connected) {
                return {
                    success: true,
                    alreadyConnected: true,
                    message: 'Já conectado!',
                    qrCode: null
                };
            }

            // Buscar QR Code
            const response = await api.get(`/instance/connect/${instanceName}`);

            // Verificar se já está conectado
            const instanceState = response.data?.instance?.state || response.data?.state;
            if (instanceState === 'open' || instanceState === 'connected') {
                return {
                    success: true,
                    alreadyConnected: true,
                    message: 'Já conectado!',
                    qrCode: null
                };
            }

            const qrCode = response.data?.qrCode || response.data?.qrcode || response.data?.base64;

            if (!qrCode) {
                return {
                    success: false,
                    message: 'QR Code não disponível. Tente novamente.',
                    qrCode: null
                };
            }

            return {
                success: true,
                qrCode: qrCode,
                alreadyConnected: false
            };

        } catch (error) {
            console.error('❌ Erro ao buscar QR Code:', error.message);

            // Se for 404, a instância pode não existir
            if (error.response && error.response.status === 404) {
                return {
                    success: false,
                    message: 'Instância não encontrada. Crie uma nova.',
                    qrCode: null
                };
            }

            return {
                success: false,
                message: error.message || 'Erro ao buscar QR Code',
                qrCode: null
            };
        }
    }

    // ============================================
    // VERIFICAR STATUS
    // ============================================

    static async getStatus(instanceName) {
        try {
            const api = this.getApiClient();

            const response = await api.get(`/instance/connectionState/${instanceName}`);

            const state = response.data?.instance?.state || response.data?.state || 'disconnected';
            const isConnected = state === 'open' || state === 'connected';

            return {
                success: true,
                state: state,
                connected: isConnected,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error.message);

            // Se for 404, consideramos como desconectado mas não falha crítica
            if (error.response && error.response.status === 404) {
                return {
                    success: true,
                    state: 'not_found',
                    connected: false,
                    message: 'Instância não encontrada'
                };
            }

            // Para outros erros, também retornamos desconectado para não travar o fluxo
            return {
                success: true, // ✅ MUDANÇA: Sucesso true para não quebrar o promise.all nas promoções
                state: 'error',
                connected: false,
                message: error.message || 'Erro ao verificar status'
            };
        }
    }

    // ============================================
    // ENVIAR MENSAGEM
    // ============================================

    static async enviarMensagem(instanceName, numero, mensagem) {
        try {
            const api = this.getApiClient();

            // Verificar se a instância está conectada
            const status = await this.getStatus(instanceName);
            if (!status.connected) {
                return {
                    success: false,
                    message: 'WhatsApp não está conectado'
                };
            }

            // Limpar número
            let numeroLimpo = numero.replace(/\D/g, '');
            if (!numeroLimpo.startsWith('55')) {
                numeroLimpo = '55' + numeroLimpo;
            }

            const response = await api.post(`/message/sendText/${instanceName}`, {
                number: numeroLimpo,
                text: mensagem,
                delay: 1200
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error.message);
            return {
                success: false,
                message: error.message || 'Erro ao enviar mensagem'
            };
        }
    }

    // ============================================
    // DESCONECTAR INSTÂNCIA
    // ============================================

    static async desconectar(instanceName) {
        try {
            const api = this.getApiClient();

            const response = await api.delete(`/instance/logout/${instanceName}`);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao desconectar:', error.message);
            return {
                success: false,
                message: error.message || 'Erro ao desconectar'
            };
        }
    }

    // ============================================
    // DELETAR INSTÂNCIA
    // ============================================

    static async deletarInstancia(instanceName) {
        try {
            const api = this.getApiClient();

            const response = await api.delete(`/instance/delete/${instanceName}`);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao deletar instância:', error.message);
            return {
                success: false,
                message: error.message || 'Erro ao deletar instância'
            };
        }
    }

    // ============================================
    // BUSCAR CONTATOS DO WHATSAPP (VIA CHATS)
    // ============================================

    static async getContatos(instanceName) {
        try {
            const api = this.getApiClient();

            console.log(`📱 Buscando contatos da instância: ${instanceName}`);

            // 🔥 VERIFICAR STATUS PRIMEIRO
            const status = await this.getStatus(instanceName);
            if (!status.connected) {
                console.log(`⚠️ Instância ${instanceName} não está conectada`);
                return [];
            }

            // 🔥 MÉTODO CONFIÁVEL: Buscar chats e extrair contatos
            let response;
            try {
                // Tentativa 1: /chat/fetchAllChats (MAIS CONFIÁVEL)
                response = await api.get(`/chat/fetchAllChats/${instanceName}`);
            } catch (error) {
                console.log(`⚠️ Erro ao buscar chats:`, error.message);
                return [];
            }

            if (!response || !response.data) {
                console.log(`⚠️ Nenhum dado retornado`);
                return [];
            }

            // Processar resposta - pode vir em diferentes formatos
            let chats = [];
            if (Array.isArray(response.data)) {
                chats = response.data;
            } else if (response.data.chats) {
                chats = response.data.chats;
            } else if (response.data.data) {
                chats = response.data.data;
            } else {
                // Tentar extrair o que veio
                chats = Object.values(response.data).filter(item =>
                    typeof item === 'object' && item !== null && (item.id || item.phone || item.number)
                );
            }

            if (chats.length === 0) {
                console.log(`⚠️ Nenhum chat encontrado`);
                return [];
            }

            console.log(`📊 ${chats.length} chats encontrados`);

            // Extrair contatos dos chats (filtrar grupos)
            const contatosMap = new Map();

            for (let chat of chats) {
                // Pular grupos
                if (chat.isGroup === true) continue;

                // Extrair número
                let number = chat.id || chat.phone || chat.number || chat.remoteJid || '';

                // Limpar número (remover @s.whatsapp.net, @g.us, etc)
                number = number.replace(/@.*$/, '');
                number = number.replace(/\D/g, '');

                if (!number || number.length < 10) continue;

                // Extrair nome
                let name = chat.name || chat.pushname || chat.displayName || chat.shortName || chat.subject || 'Sem nome';

                // Se não tem nome, tentar pegar do contato
                if (name === 'Sem nome' && chat.contact) {
                    name = chat.contact.name || chat.contact.pushname || 'Sem nome';
                }

                // Evitar duplicatas
                if (!contatosMap.has(number)) {
                    contatosMap.set(number, {
                        number: number,
                        name: name,
                        pushname: chat.pushname || '',
                        isBusiness: chat.isBusiness || false,
                        isGroup: false,
                        isMe: chat.isMe || false
                    });
                }
            }

            const contatos = Array.from(contatosMap.values());

            // Filtrar o próprio número
            const filtrados = contatos.filter(c => !c.isMe);

            console.log(`✅ ${filtrados.length} contatos encontrados (${contatos.length - filtrados.length} removidos)`);

            return filtrados;

        } catch (error) {
            console.error('❌ Erro ao buscar contatos:', error.message);
            return [];
        }
    }

    // ============================================
    // ENVIAR MENSAGEM COM MIDIA (IMAGEM)
    // ============================================

    static async enviarImagem(instanceName, numero, imagemBase64, legenda = '') {
        try {
            const api = this.getApiClient();

            const status = await this.getStatus(instanceName);
            if (!status.connected) {
                return {
                    success: false,
                    message: 'WhatsApp não está conectado'
                };
            }

            let numeroLimpo = numero.replace(/\D/g, '');
            if (!numeroLimpo.startsWith('55')) {
                numeroLimpo = '55' + numeroLimpo;
            }

            const response = await api.post(`/message/sendMedia/${instanceName}`, {
                number: numeroLimpo,
                media: imagemBase64,
                caption: legenda,
                mediatype: 'image'
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao enviar imagem:', error.message);
            return {
                success: false,
                message: error.message || 'Erro ao enviar imagem'
            };
        }
    }
}

module.exports = EvolutionInstances;