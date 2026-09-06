// ============================================
// ROTAS DE WHATSAPP - SEE&AGENDE
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono, verificarSuperAdmin } = require('../middlewares/auth');
const axios = require('axios');

// ============================================
// COMPATIBILIDADE SQLite / PostgreSQL
// ============================================

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

function extractMonth(field) {
    return isProduction ? `EXTRACT(MONTH FROM ${field})` : `strftime('%m', ${field})`;
}

function extractYear(field) {
    return isProduction ? `EXTRACT(YEAR FROM ${field})` : `strftime('%Y', ${field})`;
}

function extractDay(field) {
    return isProduction ? `EXTRACT(DAY FROM ${field})` : `strftime('%d', ${field})`;
}

function formatDate(field) {
    return isProduction ? `to_char(${field}, 'YYYY-MM-DD')` : `date(${field})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// GET /api/empresa/whatsapp/info
// ============================================

router.get('/info', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const sql = isProduction
        ? 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = ?'
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
// POST /api/whatsapp/criar-instancia
// ============================================

router.post('/criar-instancia', auth, async (req, res) => {
    try {
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
                ? 'SELECT nome, telefone_dono FROM empresas WHERE id = ?'
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

        const EvolutionInstances = require('../services/evolution-instances');
        const resultado = await EvolutionInstances.criarInstancia(
            empresaId,
            empresa.nome,
            empresa.telefone_dono
        );

        console.log(`📥 Resultado:`, resultado);

        if (resultado.success) {
            await new Promise((resolve) => {
                const sqlUpdate = isProduction
                    ? 'UPDATE empresas SET whatsapp_instance = ?, whatsapp_proprio_habilitado = true WHERE id = ?'
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

// ============================================
// GET /api/whatsapp/qrcode
// ============================================

router.get('/qrcode', auth, async (req, res) => {
    try {
        const empresaId = req.user?.empresa_id || req.usuario?.empresa_id;
        const role = req.user?.role || req.usuario?.role || 'dono';
        const isSuperAdmin = role === 'superadmin' || role === 'super_admin';

        console.log(`📱 QR CODE - Empresa: ${empresaId}, Role: ${role}`);

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT id, nome, whatsapp_instance, whatsapp_proprio_habilitado FROM empresas WHERE id = ?'
                : 'SELECT id, nome, whatsapp_instance, whatsapp_proprio_habilitado FROM empresas WHERE id = ?';
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        if (!empresa.whatsapp_instance) {
            return res.status(400).json({
                success: false,
                message: '⚠️ Nenhuma instância encontrada. Solicite ao Super Admin.',
                code: 'NO_INSTANCE'
            });
        }

        if (!isSuperAdmin && !empresa.whatsapp_proprio_habilitado) {
            return res.status(403).json({
                success: false,
                message: '⚠️ WhatsApp próprio não habilitado. Solicite ao Super Admin.',
                code: 'WAIT_ADMIN'
            });
        }

        const instanceName = empresa.whatsapp_instance;
        const EvolutionInstances = require('../services/evolution-instances');

        const status = await EvolutionInstances.getStatus(instanceName);

        if (status.connected) {
            return res.json({
                success: true,
                alreadyConnected: true,
                message: 'WhatsApp já está conectado!',
                number: status.number,
                qrCode: null
            });
        }

        try {
            const apiUrl = process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080/';
            const apiKey = process.env.EVOLUTION_API_KEY || 'seeagende2024';
            let qrCode = null;

            const connectResponse = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            const connectData = await connectResponse.json();

            if (connectData.base64) {
                qrCode = connectData.base64;
            } else if (connectData.qrcode) {
                qrCode = connectData.qrcode;
            } else if (connectData.qrCode) {
                qrCode = connectData.qrCode;
            }

            if (qrCode) {
                if (typeof qrCode === 'string' && !qrCode.startsWith('data:image')) {
                    qrCode = `data:image/png;base64,${qrCode}`;
                }

                return res.json({
                    success: true,
                    qrCode: qrCode,
                    alreadyConnected: false,
                    message: 'QR Code gerado! Escaneie com o WhatsApp.'
                });
            }

            return res.json({
                success: false,
                message: 'QR Code não disponível. Tente novamente.',
                qrCode: null
            });

        } catch (qrError) {
            console.error('❌ Erro ao buscar QR Code:', qrError.message);
            return res.json({
                success: false,
                message: 'Erro ao buscar QR Code: ' + qrError.message,
                qrCode: null
            });
        }

    } catch (error) {
        console.error('❌ Erro ao buscar QR Code:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/empresa/whatsapp/status
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

        const empresa = await new Promise((resolve, reject) => {
            const sql = 'SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at FROM empresas WHERE id = ?';
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

        if (!empresa.whatsapp_instance) {
            return res.json({
                success: true,
                data: {
                    connected: false,
                    status: 'no_instance',
                    instanceName: null,
                    number: null,
                    message: 'Nenhuma instância configurada'
                },
                status: 'off'
            });
        }

        const EvolutionInstances = require('../services/evolution-instances');
        const status = await EvolutionInstances.getStatus(empresa.whatsapp_instance);

        console.log(`📊 Status da Evolution:`, status);

        const isConnected = status.connected || status.state === 'open' || status.state === 'connected';
        const statusState = status.state || 'disconnected';

        const shouldUpdate = isConnected !== Boolean(empresa.whatsapp_connected);

        if (shouldUpdate) {
            console.log(`🔄 Atualizando status da empresa ${empresaId}: ${isConnected ? 'CONECTADO' : 'DESCONECTADO'}`);

            await new Promise((resolve, reject) => {
                // ✅ Data gerada no JS — funciona em SQLite E PostgreSQL (elimina o NOW())
                const agora = isConnected ? new Date().toISOString() : null;

                const sqlUpdate = `UPDATE empresas 
                   SET whatsapp_connected = ?, 
                       whatsapp_connected_at = ?,
                       whatsapp_number = ?
                   WHERE id = ?`;

                const params = [
                    isConnected ? 1 : 0,
                    agora,
                    status.number || empresa.whatsapp_number || null,
                    empresaId
                ];

                db.run(sqlUpdate, params, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        let number = empresa.whatsapp_number;
        if (isConnected && !number) {
            try {
                const api = EvolutionInstances.getApiClient();
                // ✅ Evolution v2: o número vem no fetchInstances (ownerJid), não em /instance/info
                const response = await api.get(`/instance/fetchInstances?instanceName=${empresa.whatsapp_instance}`);
                const instData = Array.isArray(response.data) ? response.data[0] : response.data;
                const ownerJid = instData?.ownerJid || instData?.owner || instData?.profileName || null;

                if (ownerJid) {
                    // "5511999999999@s.whatsapp.net" → "5511999999999"
                    number = String(ownerJid).split('@')[0].replace(/\D/g, '');
                }

                if (number) {
                    await new Promise((resolve) => {
                        db.run('UPDATE empresas SET whatsapp_number = ? WHERE id = ?', [number, empresaId], () => resolve());
                    });
                }
            } catch (err) {
                console.log(`⚠️ Não foi possível buscar o número: ${err.message}`);
            }
        }

        return res.json({
            success: true,
            data: {
                connected: isConnected,
                status: statusState,
                instanceName: empresa.whatsapp_instance,
                number: number || status.number || null,
                connectedAt: empresa.whatsapp_connected_at || null
            },
            status: isConnected ? 'on' : 'off'
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
            ? 'UPDATE empresas SET whatsapp_connected = false, whatsapp_number = NULL, whatsapp_connected_at = NULL WHERE id = ?'
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
            ? 'SELECT whatsapp_instance FROM empresas WHERE id = ?'
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
// GET /api/empresa/whatsapp/contatos
// ============================================

router.get('/contatos', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;

        const sql = isProduction
            ? 'SELECT whatsapp_instance FROM empresas WHERE id = ?'
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
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || 'seeagende2024';

    try {
        const empresa = await new Promise((resolve, reject) => {
            db.get('SELECT nome FROM empresas WHERE id = ?', [id], (err, row) => {
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

            console.log(`📱 Ativando WhatsApp próprio. Instância: ${instanceName}`);

            // 🔥 Headers padrão pra todas as chamadas
            const headers = {
                'Content-Type': 'application/json',
                'apikey': apiKey
            };

            try {
                // Verifica se a instância já existe
                await axios.get(`${evolutionUrl}/instance/connectionState/${instanceName}`, { headers });
                console.log(`✅ Instância ${instanceName} já existe na Evolution.`);
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.log(`🚀 Criando instância ${instanceName} na Evolution...`);

                    // 🔥 CRIAÇÃO — 'qrcode' minúsculo (a Evolution v2 exige)
                    await axios.post(`${evolutionUrl}/instance/create`, {
                        instanceName: instanceName,
                        qrcode: true,
                        integration: 'WHATSAPP-BAILEYS'
                    }, { headers });

                    // 🔥 REGISTRA O WEBHOOK — sem isso, mensagens recebidas não chegam no sistema
                    const webhookUrl = `${process.env.BASE_URL || 'https://seeagende.tech'}/api/whatsapp/webhook`;
                    try {
                        await axios.post(`${evolutionUrl}/webhook/set/${instanceName}`, {
                            webhook: {
                                enabled: true,
                                url: webhookUrl,
                                webhook_by_events: false,
                                events: {
                                    QRCODE_UPDATED: true,
                                    CONNECTION_UPDATE: true,
                                    MESSAGES_UPSERT: true,
                                    MESSAGES_UPDATE: true,
                                    SEND_MESSAGE: true
                                }
                            }
                        }, { headers });
                        console.log(`✅ Webhook configurado: ${webhookUrl}`);
                    } catch (hookErr) {
                        // Webhook falhou, mas a instância foi criada — não bloqueia o fluxo
                        console.error('⚠️ Falha ao configurar webhook:', hookErr.response?.data || hookErr.message);
                    }

                    await new Promise((resolve, reject) => {
                        db.run('UPDATE empresas SET whatsapp_instance = ? WHERE id = ?', [instanceName, id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } else {
                    // 🔥 Erro que NÃO é 404 (ex: API fora do ar, auth falhou) — precisa aparecer!
                    console.error('❌ Erro ao verificar instância na Evolution:', err.response?.data || err.message);
                    throw err;
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
        console.error('❌ Erro:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// POST /api/whatsapp/webhook
// ============================================

router.post('/webhook', async (req, res) => {
    try {
        console.log('📥 Webhook WhatsApp recebido!');
        console.log('📥 Body:', JSON.stringify(req.body, null, 2));

        const { instance, data } = req.body;

        if (data?.message?.conversation || data?.message?.text) {
            const numero = data.sender?.id || data.sender?.number || '';
            const nome = data.sender?.pushname || data.sender?.name || 'Cliente WhatsApp';
            const mensagem = data.message?.conversation || data.message?.text || '';

            const numeroLimpo = numero.replace(/@.*$/, '').replace(/\D/g, '');

            console.log(`📩 Mensagem de ${nome} (${numeroLimpo}): ${mensagem.substring(0, 50)}`);

            const sql = isProduction
                ? 'SELECT id FROM empresas WHERE whatsapp_instance = ?'
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

                const sqlCliente = isProduction
                    ? 'SELECT id FROM clientes WHERE empresa_id = ? AND telefone LIKE ?'
                    : 'SELECT id FROM clientes WHERE empresa_id = ? AND telefone LIKE ?';

                db.get(sqlCliente, [empresa.id, `%${numeroLimpo}%`], (err, clienteExistente) => {
                    if (err) {
                        console.error('❌ Erro ao buscar cliente:', err);
                        return res.sendStatus(200);
                    }

                    if (!clienteExistente) {
                        const nomeCliente = nome || 'Cliente WhatsApp';
                        const sqlInsert = isProduction
                            ? `INSERT INTO clientes (nome, telefone, empresa_id, created_at) 
                               VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
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
        res.sendStatus(200);
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

        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

        let instanceName = 'seeagende';

        if (empresa_id) {
            const sql = isProduction
                ? 'SELECT whatsapp_instance FROM empresas WHERE id = ?'
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