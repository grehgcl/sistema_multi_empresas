// ============================================
// ROTAS DE WHATSAPP
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono, verificarSuperAdmin } = require('../middlewares/auth');
const axios = require('axios');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// GET /api/empresa/whatsapp/info
// ============================================
router.get('/info', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const sql = isProduction
        ? 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = $1'
        : 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar info' });
        }

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        const superAdminHabilitou = empresa.whatsapp_proprio_habilitado === true ||
            empresa.whatsapp_proprio_habilitado === 1 ||
            empresa.whatsapp_proprio_habilitado === 't';

        const planoPermitido = ['Business', 'Enterprise', 'business', 'enterprise'].includes(empresa.plano);
        const podeUsarProprio = superAdminHabilitou || planoPermitido;

        res.json({
            success: true,
            data: {
                plano: empresa.plano,
                planoPermitido: planoPermitido,
                superAdminHabilitou: superAdminHabilitou,
                podeUsarProprio: podeUsarProprio,
                instanceName: empresa.whatsapp_instance || null,
                connected: Boolean(empresa.whatsapp_connected),
                number: empresa.whatsapp_number || null
            }
        });
    });
});

// ============================================
// POST /api/whatsapp/criar-instancia - CORRIGIDO
// ============================================
router.post('/criar-instancia', auth, async (req, res) => {
    try {
        // 🔥 CORRIGIDO: Usar req.user em vez de req.usuario
        const empresaId = req.user?.empresa_id || req.usuario?.empresa_id;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        console.log(`📱 Criando instância para empresa ${empresaId}`);

        // Buscar nome da empresa
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT nome, telefone_dono FROM empresas WHERE id = $1'
                : 'SELECT nome, telefone_dono FROM empresas WHERE id = ?';
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        // 🔥 USAR O SERVICE CORRETO
        const EvolutionInstances = require('../services/evolution-instances');
        const resultado = await EvolutionInstances.criarInstancia(
            empresaId,
            empresa.nome,
            empresa.telefone_dono
        );

        console.log(`📥 Resultado:`, resultado);

        if (resultado.success) {
            // Salvar no banco
            await new Promise((resolve) => {
                const sqlUpdate = isProduction
                    ? 'UPDATE empresas SET whatsapp_instance = $1, whatsapp_proprio_habilitado = true WHERE id = $2'
                    : 'UPDATE empresas SET whatsapp_instance = ?, whatsapp_proprio_habilitado = 1 WHERE id = ?';
                db.run(sqlUpdate, [resultado.instanceName, empresaId], () => resolve());
            });

            return res.json({
                success: true,
                message: 'Instância criada com sucesso!',
                instanceName: resultado.instanceName,
                qrCode: resultado.qrCode || null
            });
        }

        return res.status(500).json({
            success: false,
            message: resultado.message || 'Erro ao criar instância'
        });

    } catch (error) {
        console.error('❌ Erro ao criar instância:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao criar instância'
        });
    }
});

router.get('/qrcode', auth, async (req, res) => {
    try {
        const empresaId = req.user?.empresa_id || req.usuario?.empresa_id;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        console.log(`📱 QR CODE - Empresa: ${empresaId}`);

        const empresa = await new Promise((resolve) => {
            db.get('SELECT nome, whatsapp_instance FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                resolve(row);
            });
        });

        if (!empresa?.whatsapp_instance) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma instância configurada. Ative o WhatsApp primeiro.'
            });
        }

        const instanceName = empresa.whatsapp_instance;
        console.log(`📱 Instância: ${instanceName}`);

        const EvolutionInstances = require('../services/evolution-instances');
        const resultado = await EvolutionInstances.getQrCode(instanceName, empresaId, empresa.nome);

        console.log(`📥 Resultado:`, resultado);

        if (resultado.success && resultado.qrCode) {
            // 🔥 GARANTIR QUE O QR CODE É ENVIADO
            return res.json({
                success: true,
                qrCode: resultado.qrCode,
                message: 'QR Code gerado!'
            });
        } else if (resultado.alreadyConnected) {
            await new Promise((resolve) => {
                db.run('UPDATE empresas SET whatsapp_connected = 1 WHERE id = ?', [empresaId], () => resolve());
            });
            return res.json({
                success: false,
                message: 'WhatsApp já está conectado!',
                alreadyConnected: true
            });
        } else {
            return res.status(400).json({
                success: false,
                message: resultado.message || 'Erro ao gerar QR Code'
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar QR Code'
        });
    }
});

// ============================================
// GET /api/empresa/whatsapp/status - CORRIGIDO
// ============================================
router.get('/status', auth, async (req, res) => {
    try {
        const empresaId = req.usuario?.empresa_id;

        if (!empresaId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        console.log(`📊 Verificando status WhatsApp para empresa ${empresaId}`);

        // Buscar dados da empresa
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at FROM empresas WHERE id = $1'
                : 'SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at FROM empresas WHERE id = ?';
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        // Se não tem instância, retornar status desconectado
        if (!empresa.whatsapp_instance) {
            return res.json({
                success: true,
                data: {
                    connected: false,
                    status: 'no_instance',
                    instanceName: null,
                    number: null,
                    message: 'Nenhuma instância configurada'
                }
            });
        }

        // 🔥 VERIFICAR STATUS NA EVOLUTION API
        const EvolutionInstances = require('../services/evolution-instances');
        const status = await EvolutionInstances.getStatus(empresa.whatsapp_instance);

        console.log(`📊 Status da Evolution:`, status);

        // Verificar se está conectado
        const isConnected = status.connected || status.state === 'open' || status.state === 'connected';
        const statusState = status.state || 'disconnected';

        // 🔥 ATUALIZAR O BANCO SE O STATUS MUDOU
        const shouldUpdate = isConnected !== Boolean(empresa.whatsapp_connected);

        if (shouldUpdate) {
            console.log(`🔄 Atualizando status da empresa ${empresaId}: ${isConnected ? 'CONECTADO' : 'DESCONECTADO'}`);

            await new Promise((resolve, reject) => {
                const sqlUpdate = isProduction
                    ? `UPDATE empresas 
                       SET whatsapp_connected = $1, 
                           whatsapp_connected_at = ${isConnected ? 'NOW()' : 'NULL'},
                           whatsapp_number = $2
                       WHERE id = $3`
                    : `UPDATE empresas 
                       SET whatsapp_connected = ?, 
                           whatsapp_connected_at = ${isConnected ? "datetime('now')" : 'NULL'},
                           whatsapp_number = ?
                       WHERE id = ?`;

                const params = isProduction
                    ? [isConnected, status.number || empresa.whatsapp_number || null, empresaId]
                    : [isConnected ? 1 : 0, status.number || empresa.whatsapp_number || null, empresaId];

                db.run(sqlUpdate, params, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // 🔥 SE ESTIVER CONECTADO, BUSCAR O NÚMERO
        let number = empresa.whatsapp_number;
        if (isConnected && !number) {
            try {
                // Tentar buscar o número da instância
                const api = EvolutionInstances.getApiClient();
                const response = await api.get(`/instance/info/${empresa.whatsapp_instance}`);
                if (response.data?.number) {
                    number = response.data.number;
                    // Atualizar no banco
                    await new Promise((resolve) => {
                        const sqlUpdate = isProduction
                            ? 'UPDATE empresas SET whatsapp_number = $1 WHERE id = $2'
                            : 'UPDATE empresas SET whatsapp_number = ? WHERE id = ?';
                        db.run(sqlUpdate, [number, empresaId], () => resolve());
                    });
                }
            } catch (err) {
                console.log(`⚠️ Não foi possível buscar o número: ${err.message}`);
            }
        }

        // 🔥 RETORNAR STATUS ATUALIZADO
        res.json({
            success: true,
            data: {
                connected: isConnected,
                status: statusState,
                instanceName: empresa.whatsapp_instance,
                number: number || empresa.whatsapp_number || null,
                connectedAt: empresa.whatsapp_connected_at || null,
                updated: shouldUpdate
            }
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao verificar status'
        });
    }
});

// ============================================
// POST /api/empresa/whatsapp/disconnect
// ============================================
router.post('/disconnect', auth, async (req, res) => {
    try {
        const empresaId = req.usuario?.empresa_id;

        if (!empresaId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado ou sem empresa vinculada.'
            });
        }

        console.log(`🔌 Solicitando desconexão para empresa ID: ${empresaId}`);

        const empresa = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
        }

        if (empresa.whatsapp_instance) {
            try {
                console.log(`🔌 Tentando logout na Evolution para: ${empresa.whatsapp_instance}`);
                const EvolutionInstances = require('../services/evolution-instances');
                await EvolutionInstances.desconectar(empresa.whatsapp_instance);
            } catch (err) {
                console.warn(`⚠️ Falha ao desconectar na API externa (${empresa.whatsapp_instance}), mas continuando limpeza local.`);
            }
        }

        const sqlUpdate = isProduction
            ? 'UPDATE empresas SET whatsapp_connected = false, whatsapp_number = NULL, whatsapp_connected_at = NULL WHERE id = $1'
            : 'UPDATE empresas SET whatsapp_connected = 0, whatsapp_number = NULL, whatsapp_connected_at = NULL WHERE id = ?';

        await new Promise((resolve, reject) => {
            db.run(sqlUpdate, [empresaId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✅ Status WhatsApp resetado para empresa ${empresaId}`);

        res.json({
            success: true,
            message: 'WhatsApp desconectado! Você já pode conectar um novo número.'
        });

    } catch (error) {
        console.error('❌ Erro crítico ao desconectar:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao processar desconexão'
        });
    }
});

// ============================================
// POST /api/whatsapp/contatos
// ============================================
router.post('/contatos', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { instanceName } = req.body;

        const sql = isProduction
            ? 'SELECT whatsapp_instance FROM empresas WHERE id = $1'
            : 'SELECT whatsapp_instance FROM empresas WHERE id = ?';

        const empresa = await new Promise((resolve, reject) => {
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        const instancia = instanceName || empresa.whatsapp_instance;

        if (!instancia) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma instância WhatsApp configurada'
            });
        }

        const EvolutionInstances = require('../services/evolution-instances');
        const contatos = await EvolutionInstances.getContatos(instancia);

        res.json({
            success: true,
            data: contatos || [],
            instanceName: instancia
        });

    } catch (error) {
        console.error('❌ Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar contatos'
        });
    }
});

// ============================================
// POST /api/whatsapp/webhook
// ============================================
router.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log('📥 Webhook recebido:', JSON.stringify(body, null, 2));

        res.status(200).json({ success: true, message: 'Webhook recebido' });
    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /api/whatsapp/webhook
// ============================================
router.get('/webhook', (req, res) => {
    const { hub } = req.query;

    console.log('🔍 Webhook GET - Query:', req.query);

    if (hub && hub.mode === 'subscribe' && hub.verify_token) {
        const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN || 'seeagende';
        if (hub.verify_token === verifyToken) {
            console.log('✅ Webhook verificado com sucesso!');
            return res.status(200).send(hub.challenge);
        }
    }

    res.status(400).json({ success: false, message: 'Verificação falhou' });
});

// ============================================
// POST /api/whatsapp/enviar
// ============================================
router.post('/enviar', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { numero, mensagem, instanceName } = req.body;

        if (!numero || !mensagem) {
            return res.status(400).json({
                success: false,
                message: 'Número e mensagem são obrigatórios'
            });
        }

        const sql = isProduction
            ? 'SELECT whatsapp_instance FROM empresas WHERE id = $1'
            : 'SELECT whatsapp_instance FROM empresas WHERE id = ?';

        const empresa = await new Promise((resolve, reject) => {
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        const instancia = instanceName || empresa.whatsapp_instance || 'seeagende';

        const EvolutionInstances = require('../services/evolution-instances');
        const resultado = await EvolutionInstances.enviarMensagem(
            empresaId,
            numero,
            mensagem,
            instancia
        );

        if (resultado.success) {
            res.json({
                success: true,
                message: 'Mensagem enviada com sucesso!',
                data: resultado.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: resultado.message || 'Erro ao enviar mensagem'
            });
        }

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao enviar mensagem'
        });
    }
});

// ============================================
// GET /api/empresa/whatsapp/contatos
// ============================================
router.get('/contatos', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;

        const sql = isProduction
            ? 'SELECT whatsapp_instance FROM empresas WHERE id = $1'
            : 'SELECT whatsapp_instance FROM empresas WHERE id = ?';

        const empresa = await new Promise((resolve, reject) => {
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa || !empresa.whatsapp_instance) {
            return res.json({
                success: true,
                data: [],
                message: 'Nenhuma instância configurada'
            });
        }

        const EvolutionInstances = require('../services/evolution-instances');
        const contatos = await EvolutionInstances.getContatos(empresa.whatsapp_instance);

        res.json({
            success: true,
            data: contatos || [],
            instanceName: empresa.whatsapp_instance
        });

    } catch (error) {
        console.error('❌ Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar contatos'
        });
    }
});

// ============================================
// GET /api/admin/empresas/whatsapp-status
// ============================================
router.get('/admin/empresas/whatsapp-status', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT id, nome, plano, whatsapp_instance, whatsapp_connected, whatsapp_number, 
                  whatsapp_proprio_habilitado, created_at
           FROM empresas 
           ORDER BY created_at DESC`
        : `SELECT id, nome, plano, whatsapp_instance, whatsapp_connected, whatsapp_number, 
                  whatsapp_proprio_habilitado, created_at
           FROM empresas 
           ORDER BY created_at DESC`;

    db.all(sql, [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar status WhatsApp:', err);
            return res.json({ success: false, message: err.message });
        }

        const dados = empresas.map(e => {
            const habilitado = e.whatsapp_proprio_habilitado === true ||
                e.whatsapp_proprio_habilitado === 1 ||
                e.whatsapp_proprio_habilitado === 't';
            const conectado = e.whatsapp_connected === true ||
                e.whatsapp_connected === 1 ||
                e.whatsapp_connected === 't';

            return {
                id: e.id,
                nome: e.nome,
                plano: e.plano,
                whatsapp_habilitado: habilitado,
                whatsapp_conectado: conectado,
                whatsapp_instancia: e.whatsapp_instance || null,
                whatsapp_numero: e.whatsapp_number || null,
                pode_habilitar: ['Business', 'Enterprise', 'business', 'enterprise'].includes(e.plano)
            };
        });

        res.json({ success: true, data: dados });
    });
});

// ============================================
// PUT /api/admin/empresas/:id/whatsapp-proprio
// ============================================
router.put('/admin/empresas/:id/whatsapp-proprio', auth, verificarSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { habilitado } = req.body;
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || 'seeagende2024';

    try {
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT nome FROM empresas WHERE id = $1'
                : 'SELECT nome FROM empresas WHERE id = ?';
            db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        await new Promise((resolve, reject) => {
            db.run('UPDATE empresas SET whatsapp_proprio_habilitado = ? WHERE id = ?', [habilitado ? 1 : 0, id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (habilitado) {
            const nomeLimpo = empresa?.nome
                ? empresa.nome
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                : 'empresa';

            const instanceName = `emp-${id}-${nomeLimpo}`;

            console.log(`📱 Criando instância: ${instanceName}`);

            try {
                await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
                    headers: { 'apikey': apiKey }
                });
                console.log(`✅ Instância ${instanceName} já existe na Evolution.`);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.log(`🚀 Criando instância ${instanceName} na Evolution...`);
                    await axios.post(`${evolutionUrl}/instance/create`, {
                        instanceName: instanceName,
                        qrCode: true,
                        integration: 'WHATSAPP-BAILEYS'
                    }, {
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
                    });

                    await new Promise((resolve, reject) => {
                        db.run('UPDATE empresas SET whatsapp_instance = ? WHERE id = ?', [instanceName, id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            }

            res.json({
                success: true,
                message: 'WhatsApp próprio habilitado!',
                instanceName: instanceName
            });
        } else {
            res.json({
                success: true,
                message: 'WhatsApp próprio desabilitado!'
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================
// ROTAS DO WHATSAPP - WEBHOOK E ENVIO
// ============================================

// ============================================
// POST /api/whatsapp/webhook
// ============================================
router.post('/webhook', async (req, res) => {
    try {
        console.log('📥 Webhook WhatsApp recebido!');
        console.log('📥 Body:', JSON.stringify(req.body, null, 2));

        const { instance, data } = req.body;

        // Verificar se é uma mensagem
        if (data?.message?.conversation || data?.message?.text) {
            const numero = data.sender?.id || data.sender?.number || '';
            const nome = data.sender?.pushname || data.sender?.name || 'Cliente WhatsApp';
            const mensagem = data.message?.conversation || data.message?.text || '';

            // Limpar número
            const numeroLimpo = numero.replace(/@.*$/, '').replace(/\D/g, '');

            console.log(`📩 Mensagem de ${nome} (${numeroLimpo}): ${mensagem.substring(0, 50)}`);

            // Buscar empresa pela instância
            const sql = isProduction
                ? 'SELECT id FROM empresas WHERE whatsapp_instance = $1'
                : 'SELECT id FROM empresas WHERE whatsapp_instance = ?';

            db.get(sql, [instance], (err, empresa) => {
                if (err) {
                    console.error('❌ Erro ao buscar empresa:', err);
                    return res.sendStatus(200);
                }

                if (!empresa) {
                    console.log(`⚠️ Empresa não encontrada para instância: ${instance}`);
                    return res.sendStatus(200);
                }

                // Verificar se cliente já existe
                const sqlCliente = isProduction
                    ? 'SELECT id FROM clientes WHERE empresa_id = $1 AND telefone LIKE $2'
                    : 'SELECT id FROM clientes WHERE empresa_id = ? AND telefone LIKE ?';

                db.get(sqlCliente, [empresa.id, `%${numeroLimpo}%`], (err, clienteExistente) => {
                    if (err) {
                        console.error('❌ Erro ao buscar cliente:', err);
                        return res.sendStatus(200);
                    }

                    if (!clienteExistente) {
                        // Cadastrar cliente automaticamente
                        const nomeCliente = nome || 'Cliente WhatsApp';
                        const sqlInsert = isProduction
                            ? `INSERT INTO clientes (nome, telefone, empresa_id, created_at) 
                               VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`
                            : `INSERT INTO clientes (nome, telefone, empresa_id, created_at) 
                               VALUES (?, ?, ?, datetime('now'))`;

                        db.run(sqlInsert, [nomeCliente, numeroLimpo, empresa.id], (err) => {
                            if (err) {
                                console.error('❌ Erro ao cadastrar cliente:', err);
                            } else {
                                console.log(`✅ Novo cliente cadastrado automaticamente: ${nomeCliente} (${numeroLimpo})`);
                            }
                        });
                    } else {
                        console.log(`✅ Cliente já existe: ${nome} (${numeroLimpo})`);
                    }
                });
            });
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.sendStatus(200); // Sempre retornar 200 para não bloquear
    }
});

// ============================================
// GET /api/whatsapp/webhook
// ============================================
router.get('/webhook', (req, res) => {
    console.log('📥 Webhook GET - Query:', req.query);

    const { hub } = req.query;

    if (hub && hub.mode === 'subscribe' && hub.verify_token) {
        const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN || 'seeagende';
        if (hub.verify_token === verifyToken) {
            console.log('✅ Webhook verificado com sucesso!');
            return res.status(200).send(hub.challenge);
        }
    }

    res.status(400).json({
        success: false,
        message: 'Verificação falhou'
    });
});

// ============================================
// POST /api/whatsapp/enviar
// ============================================
router.post('/enviar', auth, async (req, res) => {
    console.log('📱 ROTA WHATSAPP ENVIAR CHAMADA!');
    console.log('Body:', req.body);

    try {
        const { numero, mensagem, empresa_id } = req.body;

        if (!numero || !mensagem) {
            return res.status(400).json({
                success: false,
                message: 'Número e mensagem são obrigatórios'
            });
        }

        const numeroLimpo = numero.replace(/\D/g, '');
        console.log(`📱 Número: ${numeroLimpo}`);
        console.log(`📱 Empresa ID: ${empresa_id}`);

        // URL da Evolution
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

        // Determinar qual instância usar
        let instanceName = 'seeagende'; // padrão

        // Se tiver empresa_id, buscar a instância dela
        if (empresa_id) {
            const sql = isProduction
                ? 'SELECT whatsapp_instance FROM empresas WHERE id = $1'
                : 'SELECT whatsapp_instance FROM empresas WHERE id = ?';

            const empresa = await new Promise((resolve, reject) => {
                db.get(sql, [empresa_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (empresa && empresa.whatsapp_instance) {
                instanceName = empresa.whatsapp_instance;
                console.log(`📱 Usando instância da empresa: ${instanceName}`);
            } else {
                console.log(`📱 Usando instância padrão: ${instanceName}`);
            }
        } else {
            console.log(`📱 Usando instância padrão: ${instanceName}`);
        }

        // Chamar a Evolution
        const response = await axios.post(
            `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
            {
                number: numeroLimpo,
                text: mensagem,
                delay: 1200
            },
            {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ Mensagem enviada via ${instanceName}`);

        return res.json({
            success: true,
            message: `Mensagem enviada com sucesso via ${instanceName}!`,
            data: {
                instanceName: instanceName,
                usadoInstanciaPropria: instanceName !== 'seeagende',
                evolutionResponse: response.data
            }
        });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        if (error.response) {
            console.error('❌ Response da Evolution:', error.response.data);
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Erro ao enviar mensagem'
        });
    }
});
module.exports = router;