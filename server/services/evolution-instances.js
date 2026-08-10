// ============================================
// EVOLUTION-INSTANCES.JS - GESTÃƒO DE INSTÃ‚NCIAS WHATSAPP
// CORRIGIDO - 31/07/2026
// ============================================

const axios = require('axios');

class EvolutionInstances {

    // ============================================
    // CONFIGURAÃ‡ÃƒO DA API
    // ============================================

    static getApiClient() {
        const apiUrl = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
        const apiKey = process.env.EVOLUTION_API_KEY || 'seeagende2024';

        console.log(`ðŸ”‘ API URL: ${apiUrl}`);
        console.log(`ðŸ”‘ API Key: ${apiKey.substring(0, 4)}...`);

        return axios.create({
            baseURL: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey  // ðŸ”¥ ESSA LINHA Ã‰ CRUCIAL!
            },
            timeout: 30000
        });
    }

    // ============================================
    // LISTAR TODAS AS INSTÃ‚NCIAS
    // ============================================

    static async listarInstancias() {
        try {
            const api = this.getApiClient();
            const response = await api.get('/instance/fetchInstances');
            return response.data || [];
        } catch (error) {
            console.error('âŒ Erro ao listar instÃ¢ncias:', error.message);
            return [];
        }
    }

    // ============================================
    // CRIAR INSTÃ‚NCIA COM NOME DA EMPRESA - CORRIGIDO
    // ============================================

    static async criarInstancia(empresaId, nomeEmpresa, telefone) {
        try {
            // ðŸ”¥ GARANTIR QUE O ID Ã‰ APENAS NÃšMEROS
            const idLimpo = String(empresaId).replace(/[^0-9]/g, '');

            // ðŸ”¥ SE NOME EMPRESA NÃƒO VEIO, BUSCAR NO BANCO
            let nome = nomeEmpresa;
            if (!nome || nome.trim() === '') {
                console.log(`ðŸ“± Buscando nome da empresa ${idLimpo} no banco...`);
                const { db } = require('../config/database');
                const empresa = await new Promise((resolve) => {
                    db.get('SELECT nome FROM empresas WHERE id = ?', [idLimpo], (err, row) => {
                        if (err) {
                            console.error('âŒ Erro ao buscar empresa:', err);
                            resolve(null);
                        } else {
                            resolve(row);
                        }
                    });
                });
                nome = empresa?.nome || 'empresa';
                console.log(`ðŸ“± Nome encontrado: ${nome}`);
            }

            const nomeLimpo = nome.toLowerCase().replace(/[^a-z0-9]/g, '-') || '';
            const instanceName = `emp-${idLimpo}-${nomeLimpo}`;

            console.log(`ðŸ“± Criando instÃ¢ncia: ${instanceName}`);

            const api = this.getApiClient();

            // Verificar se jÃ¡ existe
            const existing = await this.buscarInstanciaPorEmpresa(empresaId, nome);
            if (existing.success && existing.connected) {
                return {
                    success: true,
                    alreadyExists: true,
                    instanceName: existing.instanceName,
                    connected: true,
                    message: 'InstÃ¢ncia jÃ¡ existe e estÃ¡ conectada'
                };
            }

            if (existing.success) {
                return {
                    success: true,
                    alreadyExists: true,
                    instanceName: existing.instanceName,
                    connected: false,
                    message: 'InstÃ¢ncia existe mas estÃ¡ desconectada. Reconecte.'
                };
            }

            const response = await api.post('/instance/create', {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            });

            console.log(`âœ… InstÃ¢ncia ${instanceName} criada com sucesso`);

            return {
                success: true,
                instanceName: instanceName,
                alreadyExists: false,
                data: response.data
            };

        } catch (error) {
            console.error('âŒ Erro ao criar instÃ¢ncia:', error.message);
            console.error('âŒ Detalhes:', error.response?.data || error.message);

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
                message: error.response?.data?.message || error.message || 'Erro ao criar instÃ¢ncia'
            };
        }
    }

    // ============================================
    // BUSCAR INSTÃ‚NCIA POR EMPRESA - CORRIGIDO
    // ============================================

    static async buscarInstanciaPorEmpresa(empresaId, nomeEmpresa) {
        try {
            // ðŸ”¥ GARANTIR QUE O ID Ã‰ APENAS NÃšMEROS
            const idLimpo = String(empresaId).replace(/[^0-9]/g, '');

            // ðŸ”¥ SE NOME EMPRESA NÃƒO VEIO, BUSCAR NO BANCO
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

            // ðŸ”¥ GERAR NOMES POSSÃVEIS
            const possibleNames = [
                `emp-${idLimpo}-${nomeLimpo}`,
                `emp-${idLimpo}`,
                nomeLimpo ? `emp-${nomeLimpo}` : null
            ].filter(Boolean);

            console.log(`ðŸ” Buscando instÃ¢ncias para: ${possibleNames.join(', ')}`);

            const instances = await this.listarInstancias();

            for (const name of possibleNames) {
                const found = instances.find(inst => inst.name === name);
                if (found) {
                    console.log(`âœ… InstÃ¢ncia encontrada: ${found.name} (${found.connectionStatus})`);
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
                        console.log(`âœ… InstÃ¢ncia encontrada por nome parcial: ${inst.name}`);
                        return {
                            success: true,
                            instance: inst,
                            instanceName: inst.name,
                            connected: inst.connectionStatus === 'open' || inst.connectionStatus === 'connected'
                        };
                    }
                }
            }

            console.log(`âš ï¸ Nenhuma instÃ¢ncia encontrada para empresa ${idLimpo}`);
            return {
                success: false,
                message: 'Nenhuma instÃ¢ncia encontrada para esta empresa'
            };

        } catch (error) {
            console.error('âŒ Erro ao buscar instÃ¢ncia:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    static async getQrCode(instanceName, empresaId, nomeEmpresa) {
        try {
            console.log(`ðŸ“± Obtendo QR Code para ${instanceName}...`);

            const api = this.getApiClient();

            // ðŸ”¥ Verificar status
            const status = await this.getStatus(instanceName);
            console.log(`ðŸ“Š Status:`, status);

            if (status.connected) {
                return {
                    success: true,
                    alreadyConnected: true,
                    message: 'JÃ¡ conectado!',
                    qrCode: null
                };
            }

            // ðŸ”¥ DELETAR A INSTÃ‚NCIA EXISTENTE
            console.log(`ðŸ”„ Deletando instÃ¢ncia ${instanceName}...`);
            try {
                await api.delete(`/instance/delete/${instanceName}`);
                console.log(`âœ… InstÃ¢ncia deletada`);
            } catch (err) {
                console.log(`âš ï¸ Erro ao deletar:`, err.message);
            }

            // Aguardar 2 segundos
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ðŸ”¥ RECRIAR A INSTÃ‚NCIA
            console.log(`ðŸ“± Recriando instÃ¢ncia ${instanceName}...`);
            const createResponse = await api.post('/instance/create', {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            });

            console.log(`âœ… InstÃ¢ncia recriada`);
            console.log(`ðŸ“¥ Resposta:`, JSON.stringify(createResponse.data, null, 2));

            // ðŸ”¥ EXTRAIR QR CODE
            let qrCode = null;
            if (createResponse.data?.base64) {
                qrCode = createResponse.data.base64;
            } else if (createResponse.data?.qrcode) {
                qrCode = createResponse.data.qrcode;
            }

            if (qrCode) {
                // Atualizar o banco com a nova instÃ¢ncia
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
                message: 'QR Code nÃ£o disponÃ­vel. Tente novamente.',
                qrCode: null
            };

        } catch (error) {
            console.error('âŒ Erro ao buscar QR Code:', error.message);
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
            console.log(`ðŸ“Š Verificando status de ${instanceName}...`);

            const response = await api.get(`/instance/connectionState/${instanceName}`);

            // ðŸ”¥ EXTRAIR STATUS CORRETAMENTE
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

            console.log(`ðŸ“Š Status: ${state} - Conectado: ${isConnected}`);

            return {
                success: true,
                state: state,
                connected: isConnected,
                number: number,
                data: response.data
            };

        } catch (error) {
            console.error(`âŒ Erro ao verificar status:`, error.message);
            return {
                success: true,
                state: 'error',
                connected: false,
                message: error.message || 'Erro ao verificar status'
            };
        }
    }
    // ============================================
    // VERIFICAR STATUS DA INSTÃ‚NCIA DA EMPRESA
    // ============================================

    static async getStatusPorEmpresa(empresaId, nomeEmpresa) {
        const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);

        if (!instancia.success) {
            return {
                success: true,
                state: 'not_found',
                connected: false,
                message: 'InstÃ¢ncia nÃ£o encontrada'
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
            let instanceName = 'seeagende'; // Fallback para padrÃ£o
            let instanciaInfo = null;

            // Se tem empresa, tentar encontrar a instÃ¢ncia prÃ³pria
            if (empresaId) {
                const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);
                if (instancia.success && instancia.instanceName) {
                    instanceName = instancia.instanceName;
                    instanciaInfo = instancia;
                    console.log(`ðŸ“± Usando instÃ¢ncia prÃ³pria: ${instanceName} (conectada: ${instancia.connected})`);

                    // Se nÃ£o estÃ¡ conectada, usar fallback
                    if (!instancia.connected) {
                        console.log(`âš ï¸ InstÃ¢ncia ${instanceName} nÃ£o estÃ¡ conectada, usando fallback`);
                        instanceName = 'seeagende';
                    }
                } else {
                    console.log(`ðŸ“± Usando instÃ¢ncia padrÃ£o (fallback) - instÃ¢ncia prÃ³pria nÃ£o encontrada`);
                }
            }

            // Limpar nÃºmero
            let numeroLimpo = numero.replace(/\D/g, '');
            if (!numeroLimpo.startsWith('55')) {
                numeroLimpo = '55' + numeroLimpo;
            }

            console.log(`ðŸ“¤ Enviando mensagem para ${numeroLimpo} via ${instanceName}`);

            const response = await api.post(`/message/sendText/${instanceName}`, {
                number: numeroLimpo,
                text: mensagem,
                delay: 1200
            });

            console.log(`âœ… Mensagem enviada para ${numeroLimpo} via ${instanceName}`);

            return {
                success: true,
                instanceName: instanceName,
                usadoInstanciaPropria: instanceName !== 'seeagende' && empresaId,
                data: response.data
            };

        } catch (error) {
            console.error('âŒ Erro ao enviar mensagem:', error.message);

            // Se falhou e nÃ£o era fallback, tentar com a padrÃ£o
            if (instanceName !== 'seeagende') {
                console.log(`ðŸ”„ Tentando enviar pela instÃ¢ncia padrÃ£o seeagende...`);
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
                    console.error('âŒ Fallback tambÃ©m falhou:', fallbackError.message);
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

            // Se tem empresa, tentar encontrar a instÃ¢ncia prÃ³pria
            if (empresaId) {
                const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);
                if (instancia.success && instancia.instanceName && instancia.connected) {
                    instanceName = instancia.instanceName;
                    console.log(`ðŸ“± Usando instÃ¢ncia prÃ³pria para imagem: ${instanceName}`);
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
            console.error('âŒ Erro ao enviar imagem:', error.message);

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
                    console.error('âŒ Fallback imagem falhou:', fallbackError.message);
                }
            }

            return {
                success: false,
                message: error.message || 'Erro ao enviar imagem'
            };
        }
    }

    // ============================================
    // DESCONECTAR INSTÃ‚NCIA
    // ============================================

    static async desconectar(instanceName) {
        try {
            const api = this.getApiClient();

            console.log(`ðŸ”Œ Solicitando logout via POST /instance/logout/${instanceName}`);
            const response = await api.post(`/instance/logout/${instanceName}`);

            console.log(`âœ… Logout realizado com sucesso na instÃ¢ncia ${instanceName}`);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('âŒ Erro ao desconectar:', error.message);

            if (error.response && (error.response.status === 404 || error.response.status === 400)) {
                return {
                    success: true,
                    message: 'InstÃ¢ncia jÃ¡ estava desconectada ou nÃ£o encontrada.'
                };
            }

            return {
                success: false,
                message: error.message || 'Erro ao desconectar'
            };
        }
    }

    // ============================================
    // DELETAR INSTÃ‚NCIA
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
            console.error('âŒ Erro ao deletar instÃ¢ncia:', error.message);
            return {
                success: false,
                message: error.message || 'Erro ao deletar instÃ¢ncia'
            };
        }
    }

    // ============================================
    // DELETAR INSTÃ‚NCIA POR EMPRESA
    // ============================================

    static async deletarInstanciaPorEmpresa(empresaId, nomeEmpresa) {
        try {
            const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);

            if (!instancia.success || !instancia.instanceName) {
                return {
                    success: false,
                    message: 'InstÃ¢ncia nÃ£o encontrada para esta empresa'
                };
            }

            return await this.deletarInstancia(instancia.instanceName);

        } catch (error) {
            console.error('âŒ Erro ao deletar instÃ¢ncia da empresa:', error.message);
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

            console.log(`ðŸ“± Buscando contatos da instÃ¢ncia: ${instanceName}`);

            const status = await this.getStatus(instanceName);
            if (!status.connected) {
                console.log(`âš ï¸ InstÃ¢ncia ${instanceName} nÃ£o estÃ¡ conectada`);
                return [];
            }

            let response;
            try {
                response = await api.get(`/chat/fetchAllChats/${instanceName}`);
            } catch (error) {
                console.log(`âš ï¸ Erro ao buscar chats:`, error.message);
                return [];
            }

            if (!response || !response.data) {
                console.log(`âš ï¸ Nenhum dado retornado`);
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
                console.log(`âš ï¸ Nenhum chat encontrado`);
                return [];
            }

            console.log(`ðŸ“Š ${chats.length} chats encontrados`);

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

            console.log(`âœ… ${filtrados.length} contatos encontrados`);

            return filtrados;

        } catch (error) {
            console.error('âŒ Erro ao buscar contatos:', error.message);
            return [];
        }
    }

    // ============================================
    // BUSCAR CONTATOS POR EMPRESA
    // ============================================

    static async getContatosPorEmpresa(empresaId, nomeEmpresa) {
        const instancia = await this.buscarInstanciaPorEmpresa(empresaId, nomeEmpresa);

        if (!instancia.success || !instancia.instanceName) {
            console.log(`âš ï¸ Nenhuma instÃ¢ncia encontrada para empresa ${empresaId}`);
            return [];
        }

        return await this.getContatos(instancia.instanceName);
    }
}

module.exports = EvolutionInstances;