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
// GET /api/whatsapp/info - NUNCA CRIA INSTÂNCIA
// ============================================
router.get('/info', auth, async (req, res) => {
    const empresaId = req.usuario?.empresa_id || req.user?.empresa_id;

    console.log(`🔍 Buscando info WhatsApp para empresa ${empresaId}`);
    console.log(`👤 Role: ${req.usuario?.role || req.user?.role}`);

    // 🔥 APENAS CONSULTAR O BANCO - NUNCA CRIAR
    const sql = isProduction
        ? 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = $1'
        : 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], async (err, empresa) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar info' });
        }

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        console.log(`📊 Dados da empresa:`, {
            instanceName: empresa.whatsapp_instance,
            connected: empresa.whatsapp_connected,
            habilitado: empresa.whatsapp_proprio_habilitado
        });

        const superAdminHabilitou = empresa.whatsapp_proprio_habilitado === true ||
            empresa.whatsapp_proprio_habilitado === 1 ||
            empresa.whatsapp_proprio_habilitado === 't' ||
            empresa.whatsapp_proprio_habilitado === 'true';

        const planoPermitido = ['Business', 'Enterprise', 'business', 'enterprise'].includes(empresa.plano);

        let connected = false;
        let state = 'disconnected';
        let number = null;
        let qrCode = null;

        // 🔥 SE TIVER INSTÂNCIA, VERIFICAR STATUS NA EVOLUTION
        if (empresa.whatsapp_instance) {
            try {
                const evolution = require('../services/evolution-instances');
                const status = await evolution.getStatus(empresa.whatsapp_instance);

                state = status.state || 'disconnected';
                connected = status.connected || false;
                number = status.number || null;
            } catch (e) {
                console.error('❌ Erro ao verificar Evolution:', e.message);
                connected = Boolean(empresa.whatsapp_connected);
                state = connected ? 'open' : 'disconnected';
                number = empresa.whatsapp_number || null;
            }
        }

        // 🔥 NUNCA CRIAR INSTÂNCIA AQUI! APENAS RETORNAR

        res.json({
            success: true,
            data: {
                plano: empresa.plano,
                planoPermitido: planoPermitido,
                superAdminHabilitou: superAdminHabilitou,
                podeUsarProprio: superAdminHabilitou || planoPermitido,
                instanceName: empresa.whatsapp_instance || null,
                connected: connected,
                state: state,
                number: number,
                qrCode: qrCode
            }
        });
    });
});
// ============================================
// POST /api/whatsapp/criar-instancia - BLOQUEADO PARA DONO
// ============================================
router.post('/criar-instancia', auth, async (req, res) => {
    try {
        const role = req.usuario?.role || req.user?.role;

        console.log(`🔍 Tentativa de criar instância - Role: ${role}`);

        if (role !== 'super_admin' && role !== 'superadmin') {
            console.log('❌ BLOQUEADO: Usuário não é Super Admin');
            return res.status(403).json({
                success: false,
                message: '⚠️ Apenas o Super Admin pode criar instâncias WhatsApp.'
            });
        }

        const empresaId = req.usuario?.empresa_id || req.user?.empresa_id;

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        console.log(`📱 Criando instância para empresa ${empresaId} (Super Admin)`);

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

        const EvolutionInstances = require('../services/evolution-instances');
        const resultado = await EvolutionInstances.criarInstancia(
            empresaId,
            empresa.nome,
            empresa.telefone_dono
        );

        if (resultado.success) {
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
// ============================================
// GET /api/whatsapp/qrcode - CORRIGIDO
// ============================================
router.get('/qrcode', auth, async (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const role = req.usuario.role || 'dono';
    const isSuperAdmin = role === 'superadmin' || role === 'super_admin';

    try {
        // Buscar empresa
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT id, nome, whatsapp_instance, whatsapp_proprio_habilitado FROM empresas WHERE id = $1'
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

        // 🔥 SE NÃO TEM INSTÂNCIA, RETORNAR ERRO
        if (!empresa.whatsapp_instance) {
            return res.status(400).json({
                success: false,
                message: '⚠️ Nenhuma instância encontrada. Solicite ao Super Admin.',
                code: 'NO_INSTANCE'
            });
        }

        // 🔥 SE É DONO E NÃO HABILITADO PELO SUPER ADMIN
        if (!isSuperAdmin && !empresa.whatsapp_proprio_habilitado) {
            return res.status(403).json({
                success: false,
                message: '⚠️ WhatsApp próprio não habilitado. Solicite ao Super Admin.',
                code: 'WAIT_ADMIN'
            });
        }

        const instanceName = empresa.whatsapp_instance;

        // 🔥 BUSCAR QR CODE DIRETO DA EVOLUTION
        try {
            // Tentar primeiro o endpoint /instance/connect (que funcionou)
            let qrResponse = await fetch(`http://163.176.218.131:8080/instance/connect/${instanceName}`, {
                headers: { 'apikey': 'seeagende2024' }
            });

            let qrData = await qrResponse.json();
            let qrCode = null;

            if (qrData.base64) {
                qrCode = qrData.base64;
                console.log(`✅ QR Code obtido via /connect para ${instanceName}`);
            } else {
                // Tentar o endpoint /qrcode
                qrResponse = await fetch(`http://163.176.218.131:8080/instance/qrcode/${instanceName}`, {
                    headers: { 'apikey': 'seeagende2024' }
                });
                qrData = await qrResponse.json();
                if (qrData.base64) {
                    qrCode = qrData.base64;
                    console.log(`✅ QR Code obtido via /qrcode para ${instanceName}`);
                }
            }

            if (qrCode) {
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
// GET /api/whatsapp/status - PARA O INDICADOR
// ============================================
router.get('/status', auth, async (req, res) => {
    try {
        const usuario = req.user || req.usuario;
        
        console.log('🔍 Status - Usuário:', usuario?.email);
        console.log('🔍 Status - Role:', usuario?.role);
        console.log('🔍 Status - Empresa ID:', usuario?.empresa_id);

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }

        const isSuperAdmin = usuario.role === 'super_admin' || usuario.role === 'superadmin';
        const empresaId = usuario.empresa_id;

        // 🔥 SUPER ADMIN - Buscar a primeira empresa com instância
        if (isSuperAdmin) {
            console.log('👑 Super Admin - Buscando status de todas as empresas...');
            
            const empresas = await new Promise((resolve, reject) => {
                const sql = isProduction
                    ? `SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number 
                       FROM empresas 
                       WHERE whatsapp_instance IS NOT NULL 
                       ORDER BY id LIMIT 1`
                    : `SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number 
                       FROM empresas 
                       WHERE whatsapp_instance IS NOT NULL 
                       ORDER BY id LIMIT 1`;
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            if (empresas.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        connected: false,
                        status: 'no_instance',
                        instanceName: null,
                        number: null,
                        message: 'Nenhuma empresa com WhatsApp configurado'
                    }
                });
            }

            const primeiraEmpresa = empresas[0];
            
            try {
                const EvolutionInstances = require('../services/evolution-instances');
                const status = await EvolutionInstances.getStatus(primeiraEmpresa.whatsapp_instance);
                const isConnected = status.connected || status.state === 'open' || status.state === 'connected';

                return res.json({
                    success: true,
                    data: {
                        connected: isConnected,
                        status: status.state || 'disconnected',
                        instanceName: primeiraEmpresa.whatsapp_instance,
                        number: primeiraEmpresa.whatsapp_number || null,
                        message: isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado',
                        empresa_nome: primeiraEmpresa.nome
                    }
                });
            } catch (err) {
                return res.json({
                    success: true,
                    data: {
                        connected: false,
                        status: 'error',
                        instanceName: primeiraEmpresa.whatsapp_instance,
                        number: null,
                        message: 'Erro ao verificar status: ' + err.message,
                        empresa_nome: primeiraEmpresa.nome
                    }
                });
            }
        }

        // 🔥 DONO - Buscar status da própria empresa
        if (!empresaId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário sem empresa vinculada'
            });
        }

        console.log(`📊 Verificando status WhatsApp para empresa ${empresaId}`);

        const sql = isProduction
            ? 'SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at FROM empresas WHERE id = $1'
            : 'SELECT id, nome, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at FROM empresas WHERE id = ?';

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

        try {
            const EvolutionInstances = require('../services/evolution-instances');
            const status = await EvolutionInstances.getStatus(empresa.whatsapp_instance);

            const isConnected = status.connected || status.state === 'open' || status.state === 'connected';
            const statusState = status.state || 'disconnected';

            if (isConnected !== Boolean(empresa.whatsapp_connected)) {
                const sqlUpdate = isProduction
                    ? `UPDATE empresas SET whatsapp_connected = $1 WHERE id = $2`
                    : `UPDATE empresas SET whatsapp_connected = ? WHERE id = ?`;
                await new Promise((resolve) => {
                    db.run(sqlUpdate, [isConnected ? 1 : 0, empresaId], () => resolve());
                });
            }

            return res.json({
                success: true,
                data: {
                    connected: isConnected,
                    status: statusState,
                    instanceName: empresa.whatsapp_instance,
                    number: empresa.whatsapp_number || null,
                    connectedAt: empresa.whatsapp_connected_at || null
                }
            });

        } catch (err) {
            console.error('❌ Erro ao verificar Evolution:', err.message);
            return res.json({
                success: true,
                data: {
                    connected: Boolean(empresa.whatsapp_connected),
                    status: empresa.whatsapp_connected ? 'open' : 'disconnected',
                    instanceName: empresa.whatsapp_instance,
                    number: empresa.whatsapp_number || null,
                    connectedAt: empresa.whatsapp_connected_at || null
                }
            });
        }

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