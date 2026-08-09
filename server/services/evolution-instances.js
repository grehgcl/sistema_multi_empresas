// ============================================
// EVOLUTION-INSTANCES.JS - GESTÃO DE INSTÂNCIAS WHATSAPP
// CORRIGIDO - 31/07/2026
// ============================================

const axios = require('axios');

class EvolutionInstances {

    // ============================================
    // CONFIGURAÇÃO DA API
    // ============================================

    static getApiClient() {
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || 'seeagende2024';

        console.log(`🔑 API URL: ${apiUrl}`);
        console.log(`🔑 API Key: ${apiKey.substring(0, 4)}...`);

        return axios.create({
            baseURL: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey  // 🔥 ESSA LINHA É CRUCIAL!
            },
            timeout: 30000
        });
    }

    // ============================================
    // LISTAR TODAS AS INSTÂNCIAS
    // ============================================

    static async listarInstancias() {
        try {
            const api = this.getApiClient();
            const response = await api.get('/instance/fetchInstances');
            return response.data || [];
        } catch (error) {
            console.error('❌ Erro ao listar instâncias:', error.message);
            return [];
        }
    }

    // ============================================
    // CRIAR INSTÂNCIA COM NOME DA EMPRESA - CORRIGIDO
    // ============================================

    static async criarInstancia(empresaId, nomeEmpresa, telefone) {
        try {
            // 🔥 GARANTIR QUE O ID É APENAS NÚMEROS
            const idLimpo = String(empresaId).replace(/[^0-9]/g, '');

            // 🔥 SE NOME EMPRESA NÃO VEIO, BUSCAR NO BANCO
            let nome = nomeEmpresa;
            if (!nome || nome.trim() === '') {
                console.log(`📱 Buscando nome da empresa ${idLimpo} no banco...`);
                const { db } = require('../config/database');
                const empresa = await new Promise((resolve) => {
                    db.get('SELECT nome FROM empresas WHERE id = ?', [idLimpo], (err, row) => {
                        if (err) {
                            console.error('❌ Erro ao buscar empresa:', err);
                            resolve(null);
                        } else {
                            resolve(row);
                        }
                    });
                });
                nome = empresa?.nome || 'empresa';
                console.log(`📱 Nome encontrado: ${nome}`);
            }

            const nomeLimpo = nome.toLowerCase().replace(/[^a-z0-9]/g, '-') || '';
            const instanceName = `emp-${idLimpo}-${nomeLimpo}`;

            console.log(`📱 Criando instância: ${instanceName}`);

            const api = this.getApiClient();

            // Verificar se já existe
            const existing = await this.buscarInstanciaPorEmpresa(empresaId, nome);
            if (existing.success && existing.connected) {
                return {
                    success: true,
                    alreadyExists: true,
                    instanceName: existing.instanceName,
                    connected: true,
                    message: 'Instância já existe e está conectada'
                };
            }

            if (existing.success) {
                return {
                    success: true,
                    alreadyExists: true,
                    instanceName: existing.instanceName,
                    connected: false,
                    message: 'Instância existe mas está desconectada. Reconecte.'
                };
            }

            const response = await api.post('/instance/create', {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            });

            console.log(`✅ Instância ${instanceName} criada com sucesso`);

            return {
                success: true,
                instanceName: instanceName,
                alreadyExists: false,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao criar instância:', error.message);
            console.error('❌ Detalhes:', error.response?.data || error.message);

            if (error.response && error.response.status === 400) {
                const existing = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);
                if (existing.success) {
                    return {
                        success: true,
                        alreadyExists: true,
                        instanceName: existing.instanceName,
                        connected: existing.connected
                    };
                }
            }

            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Erro ao criar instância'
            };
        }
    }

    // ============================================
    // BUSCAR INSTÂNCIA POR EMPRESA - CORRIGIDO
    // ============================================

    static async buscarInstanciaPorEmpresa(empresaId, nomeEmpresa) {
        try {
            // 🔥 GARANTIR QUE O ID É APENAS NÚMEROS
            const idLimpo = String(empresaId).replace(/[^0-9]/g, '');

            // 🔥 SE NOME EMPRESA NÃO VEIO, BUSCAR NO BANCO
            let nome = nomeEmpresa;
            if (!nome || nome.trim() === '') {
                const { db } = require('../config/database');
                const empresa = await new Promise((resolve) => {
                    db.get('SELECT nome FROM empresas WHERE id = ?', [idLimpo], (err, row) => {
                        resolve(row);
                    });
                });
                nome = empresa?.nome || 'empresa';
            }

            const nomeLimpo = nome.toLowerCase().replace(/[^a-z0-9]/g, '-') || '';

            // 🔥 GERAR NOMES POSSÍVEIS
            const possibleNames = [
                `emp-${idLimpo}-${nomeLimpo}`,
                `emp-${idLimpo}`,
                nomeLimpo ? `emp-${nomeLimpo}` : null
            ].filter(Boolean);

            console.log(`🔍 Buscando instâncias para: ${possibleNames.join(', ')}`);

            const instances = await this.listarInstancias();

            for (const name of possibleNames) {
                const found = instances.find(inst => inst.name === name);
                if (found) {
                    console.log(`✅ Instância encontrada: ${found.name} (${found.connectionStatus})`);
                    return {
                        success: true,
                        instance: found,
                        instanceName: found.name,
                        connected: found.connectionStatus === 'open' || found.connectionStatus === 'connected'
                    };
                }
            }

            // Busca por nome parcial
            const nomeBusca = nome.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
            if (nomeBusca) {
                for (const inst of instances) {
                    const instName = inst.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (instName.includes(idLimpo) && instName.includes(nomeBusca.substring(0, 5))) {
                        console.log(`✅ Instância encontrada por nome parcial: ${inst.name}`);
                        return {
                            success: true,
                            instance: inst,
                            instanceName: inst.name,
                            connected: inst.connectionStatus === 'open' || inst.connectionStatus === 'connected'
                        };
                    }
                }
            }

            console.log(`⚠️ Nenhuma instância encontrada para empresa ${idLimpo}`);
            return {
                success: false,
                message: 'Nenhuma instância encontrada para esta empresa'
            };

        } catch (error) {
            console.error('❌ Erro ao buscar instância:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    static async getQrCode(instanceName, empresaId, nomeEmpresa) {
        try {
            console.log(`📱 Obtendo QR Code para ${instanceName}...`);

            const api = this.getApiClient();

            // 🔥 Verificar status
            const status = await this.getStatus(instanceName);
            console.log(`📊 Status:`, status);

            if (status.connected) {
                return {
                    success: true,
                    alreadyConnected: true,
                    message: 'Já conectado!',
                    qrCode: null
                };
            }

            // 🔥 DELETAR A INSTÂNCIA EXISTENTE
            console.log(`🔄 Deletando instância ${instanceName}...`);
            try {
                await api.delete(`/instance/delete/${instanceName}`);
                console.log(`✅ Instância deletada`);
            } catch (err) {
                console.log(`⚠️ Erro ao deletar:`, err.message);
            }

            // Aguardar 2 segundos
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 🔥 RECRIAR A INSTÂNCIA
            console.log(`📱 Recriando instância ${instanceName}...`);
            const createResponse = await api.post('/instance/create', {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            });

            console.log(`✅ Instância recriada`);
            console.log(`📥 Resposta:`, JSON.stringify(createResponse.data, null, 2));

            // 🔥 EXTRAIR QR CODE
            let qrCode = null;
            if (createResponse.data?.base64) {
                qrCode = createResponse.data.base64;
            } else if (createResponse.data?.qrcode) {
                qrCode = createResponse.data.qrcode;
            }

            if (qrCode) {
                // Atualizar o banco com a nova instância
                const { db } = require('../config/database');
                await new Promise((resolve) => {
                    db.run('UPDATE empresas SET whatsapp_instance = ? WHERE id = ?', [instanceName, empresaId], () => resolve());
                });

                return {
                    success: true,
                    qrCode: qrCode,
                    alreadyConnected: false,
                    message: 'QR Code gerado! Escaneie com o WhatsApp.'
                };
            }

            return {
                success: false,
                message: 'QR Code não disponível. Tente novamente.',
                qrCode: null
            };

        } catch (error) {
            console.error('❌ Erro ao buscar QR Code:', error.message);
            return {
                success: false,
                message: error.message || 'Erro ao buscar QR Code',
                qrCode: null
            };
        }
    }
    static async getStatus(instanceName) {
        try {
            const api = this.getApiClient();
            console.log(`📊 Verificando status de ${instanceName}...`);

            const response = await api.get(`/instance/connectionState/${instanceName}`);

            // 🔥 EXTRAIR STATUS CORRETAMENTE
            let state = 'disconnected';
            let number = null;

            if (response.data?.instance?.state) {
                state = response.data.instance.state;
                number = response.data.instance?.number || null;
            } else if (response.data?.state) {
                state = response.data.state;
                number = response.data.number || null;
            }

            const isConnected = state === 'open' || state === 'connected' || state === 'CONNECTED';

            console.log(`📊 Status: ${state} - Conectado: ${isConnected}`);

            return {
                success: true,
                state: state,
                connected: isConnected,
                number: number,
                data: response.data
            };

        } catch (error) {
            console.error(`❌ Erro ao verificar status:`, error.message);
            return {
                success: true,
                state: 'error',
                connected: false,
                message: error.message || 'Erro ao verificar status'
            };
        }
    }
    // ============================================
    // VERIFICAR STATUS DA INSTÂNCIA DA EMPRESA
    // ============================================

    static async getStatusPorEmpresa(empresaId, nomeEmpresa) {
        const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);

        if (!instancia.success) {
            return {
                success: true,
                state: 'not_found',
                connected: false,
                message: 'Instância não encontrada'
            };
        }

        return {
            success: true,
            state: instancia.instance?.connectionStatus || 'disconnected',
            connected: instancia.connected || false,
            instanceName: instancia.instanceName,
            data: instancia.instance
        };
    }

    // ============================================
    // ENVIAR MENSAGEM - CORRIGIDO COM BUSCA POR EMPRESA
    // ============================================

    static async enviarMensagem(empresaId, numero, mensagem, nomeEmpresa) {
        try {
            const api = this.getApiClient();
            let instanceName = 'seeagende'; // Fallback para padrão
            let instanciaInfo = null;

            // Se tem empresa, tentar encontrar a instância própria
            if (empresaId) {
                const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);
                if (instancia.success && instancia.instanceName) {
                    instanceName = instancia.instanceName;
                    instanciaInfo = instancia;
                    console.log(`📱 Usando instância própria: ${instanceName} (conectada: ${instancia.connected})`);

                    // Se não está conectada, usar fallback
                    if (!instancia.connected) {
                        console.log(`⚠️ Instância ${instanceName} não está conectada, usando fallback`);
                        instanceName = 'seeagende';
                    }
                } else {
                    console.log(`📱 Usando instância padrão (fallback) - instância própria não encontrada`);
                }
            }

            // Limpar número
            let numeroLimpo = numero.replace(/\D/g, '');
            if (!numeroLimpo.startsWith('55')) {
                numeroLimpo = '55' + numeroLimpo;
            }

            console.log(`📤 Enviando mensagem para ${numeroLimpo} via ${instanceName}`);

            const response = await api.post(`/message/sendText/${instanceName}`, {
                number: numeroLimpo,
                text: mensagem,
                delay: 1200
            });

            console.log(`✅ Mensagem enviada para ${numeroLimpo} via ${instanceName}`);

            return {
                success: true,
                instanceName: instanceName,
                usadoInstanciaPropria: instanceName !== 'seeagende' && empresaId,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error.message);

            // Se falhou e não era fallback, tentar com a padrão
            if (instanceName !== 'seeagende') {
                console.log(`🔄 Tentando enviar pela instância padrão seeagende...`);
                try {
                    const api = this.getApiClient();
                    const numeroLimpo = numero.replace(/\D/g, '');
                    const response = await api.post(`/message/sendText/seeagende`, {
                        number: numeroLimpo,
                        text: mensagem,
                        delay: 1200
                    });
                    return {
                        success: true,
                        instanceName: 'seeagende (fallback)',
                        usadoInstanciaPropria: false,
                        fallback: true,
                        data: response.data
                    };
                } catch (fallbackError) {
                    console.error('❌ Fallback também falhou:', fallbackError.message);
                }
            }

            return {
                success: false,
                message: error.message || 'Erro ao enviar mensagem'
            };
        }
    }

    // ============================================
    // ENVIAR MENSAGEM COM MIDIA (IMAGEM)
    // ============================================

    static async enviarImagem(empresaId, numero, imagemBase64, legenda = '', nomeEmpresa) {
        try {
            const api = this.getApiClient();
            let instanceName = 'seeagende';

            // Se tem empresa, tentar encontrar a instância própria
            if (empresaId) {
                const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);
                if (instancia.success && instancia.instanceName && instancia.connected) {
                    instanceName = instancia.instanceName;
                    console.log(`📱 Usando instância própria para imagem: ${instanceName}`);
                }
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
                instanceName: instanceName,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao enviar imagem:', error.message);

            // Tentar fallback
            if (instanceName !== 'seeagende') {
                try {
                    const api = this.getApiClient();
                    const numeroLimpo = numero.replace(/\D/g, '');
                    const response = await api.post(`/message/sendMedia/seeagende`, {
                        number: numeroLimpo,
                        media: imagemBase64,
                        caption: legenda,
                        mediatype: 'image'
                    });
                    return {
                        success: true,
                        instanceName: 'seeagende (fallback)',
                        fallback: true,
                        data: response.data
                    };
                } catch (fallbackError) {
                    console.error('❌ Fallback imagem falhou:', fallbackError.message);
                }
            }

            return {
                success: false,
                message: error.message || 'Erro ao enviar imagem'
            };
        }
    }

    // ============================================
    // DESCONECTAR INSTÂNCIA
    // ============================================

    static async desconectar(instanceName) {
        try {
            const api = this.getApiClient();

            console.log(`🔌 Solicitando logout via POST /instance/logout/${instanceName}`);
            const response = await api.post(`/instance/logout/${instanceName}`);

            console.log(`✅ Logout realizado com sucesso na instância ${instanceName}`);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Erro ao desconectar:', error.message);

            if (error.response && (error.response.status === 404 || error.response.status === 400)) {
                return {
                    success: true,
                    message: 'Instância já estava desconectada ou não encontrada.'
                };
            }

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
    // DELETAR INSTÂNCIA POR EMPRESA
    // ============================================

    static async deletarInstanciaPorEmpresa(empresaId, nomeEmpresa) {
        try {
            const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);

            if (!instancia.success || !instancia.instanceName) {
                return {
                    success: false,
                    message: 'Instância não encontrada para esta empresa'
                };
            }

            return await this.deletarInstancia(instancia.instanceName);

        } catch (error) {
            console.error('❌ Erro ao deletar instância da empresa:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // ============================================
    // BUSCAR CONTATOS DO WHATSAPP
    // ============================================

    static async getContatos(instanceName) {
        try {
            const api = this.getApiClient();

            console.log(`📱 Buscando contatos da instância: ${instanceName}`);

            const status = await this.getStatus(instanceName);
            if (!status.connected) {
                console.log(`⚠️ Instância ${instanceName} não está conectada`);
                return [];
            }

            let response;
            try {
                response = await api.get(`/chat/fetchAllChats/${instanceName}`);
            } catch (error) {
                console.log(`⚠️ Erro ao buscar chats:`, error.message);
                return [];
            }

            if (!response || !response.data) {
                console.log(`⚠️ Nenhum dado retornado`);
                return [];
            }

            let chats = [];
            if (Array.isArray(response.data)) {
                chats = response.data;
            } else if (response.data.chats) {
                chats = response.data.chats;
            } else if (response.data.data) {
                chats = response.data.data;
            } else {
                chats = Object.values(response.data).filter(item =>
                    typeof item === 'object' && item !== null && (item.id || item.phone || item.number)
                );
            }

            if (chats.length === 0) {
                console.log(`⚠️ Nenhum chat encontrado`);
                return [];
            }

            console.log(`📊 ${chats.length} chats encontrados`);

            const contatosMap = new Map();

            for (let chat of chats) {
                if (chat.isGroup === true) continue;

                let number = chat.id || chat.phone || chat.number || chat.remoteJid || '';
                number = number.replace(/@.*$/, '');
                number = number.replace(/\D/g, '');

                if (!number || number.length < 10) continue;

                let name = chat.name || chat.pushname || chat.displayName || chat.shortName || chat.subject || 'Sem nome';

                if (name === 'Sem nome' && chat.contact) {
                    name = chat.contact.name || chat.contact.pushname || 'Sem nome';
                }

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
            const filtrados = contatos.filter(c => !c.isMe);

            console.log(`✅ ${filtrados.length} contatos encontrados`);

            return filtrados;

        } catch (error) {
            console.error('❌ Erro ao buscar contatos:', error.message);
            return [];
        }
    }

    // ============================================
    // BUSCAR CONTATOS POR EMPRESA
    // ============================================

    static async getContatosPorEmpresa(empresaId, nomeEmpresa) {
        const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);

        if (!instancia.success || !instancia.instanceName) {
            console.log(`⚠️ Nenhuma instância encontrada para empresa ${empresaId}`);
            return [];
        }

        return await this.getContatos(instancia.instanceName);
    }
}

module.exports = EvolutionInstances;