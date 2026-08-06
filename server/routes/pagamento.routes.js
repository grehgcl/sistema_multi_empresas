// ============================================
// ROTAS DE PAGAMENTOS
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono, verificarSuperAdmin } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// PLANOS DISPONÍVEIS
// ============================================
const PLANOS = {
    starter: { nome: 'Starter', limite: 1, valor: 29.90 },
    pro: { nome: 'Pro', limite: 5, valor: 59.90 },
    business: { nome: 'Business', limite: 15, valor: 119.90 },
    enterprise: { nome: 'Enterprise', limite: 999, valor: 249.90 }
};

// server/routes/pagamento.routes.js

// ============================================
// FUNÇÃO PARA OBTER MODO DE PAGAMENTO (COM CRIAÇÃO AUTOMÁTICA)
// ============================================
function getPaymentMode(callback) {
    // Primeiro, tentar criar a tabela se não existir
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.run(createTableSQL, [], (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela configuracoes:', err);
            return callback('simulation');
        }

        // Buscar o valor
        const sql = 'SELECT valor FROM configuracoes WHERE chave = "payment_mode"';
        db.get(sql, [], (err, row) => {
            if (err) {
                console.error('❌ Erro ao buscar modo de pagamento:', err);
                return callback('simulation');
            }

            if (row) {
                return callback(row.valor);
            }

            // Se não existir, criar com padrão
            const sqlInsert = 'INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ("payment_mode", "simulation")';
            db.run(sqlInsert, [], () => {
                callback('simulation');
            });
        });
    });
}

// ============================================
// GET /api/pagamento/config - MODO DE PAGAMENTO
// ============================================
router.get('/config', auth, (req, res) => {
    getPaymentMode((mode) => {
        const isReal = mode === 'real';
        const label = isReal ? '🔴 Pagamentos Reais' : '🟡 Modo Simulação';

        console.log(`📊 GET /api/pagamento/config - Modo atual: ${mode}`);

        res.json({
            success: true,
            data: {
                mode: mode,
                isReal: isReal,
                isSimulation: !isReal,
                label: label,
                mercado_pago: {
                    configured: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
                    env: process.env.MERCADO_PAGO_ENV || 'sandbox'
                }
            }
        });
    });
});

// ============================================
// PUT /api/pagamento/config - ALTERAR MODO DE PAGAMENTO
// ============================================
router.put('/config', auth, verificarSuperAdmin, (req, res) => {
    const { mode } = req.body;

    if (mode !== 'simulation' && mode !== 'real') {
        return res.status(400).json({
            success: false,
            message: 'Modo inválido. Use "simulation" ou "real"'
        });
    }

    console.log(`📝 Alterando modo de pagamento para: ${mode}`);

    const sql = `UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = "payment_mode"`;

    db.run(sql, [mode], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar modo de pagamento:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar modo de pagamento'
            });
        }

        console.log(`✅ Modo de pagamento alterado para: ${mode}`);

        res.json({
            success: true,
            message: `Modo de pagamento alterado para: ${mode === 'real' ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`,
            data: {
                mode: mode,
                isReal: mode === 'real',
                isSimulation: mode !== 'real'
            }
        });
    });
});

// ============================================
// GET /api/payment/status
// ============================================
router.get('/status', (req, res) => {
    getPaymentMode((mode) => {
        res.json({
            success: true,
            message: 'Rota de pagamento funcionando',
            mode: mode
        });
    });
});

// ============================================
// POST /api/simulate-payment
// ============================================
router.post('/simulate-payment', auth, async (req, res) => {
    try {
        const { plano, empresaId } = req.body;

        const empresaIdFinal = empresaId || req.usuario?.empresa_id;

        if (!empresaIdFinal) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        const planoInfo = PLANOS[plano];
        if (!planoInfo) {
            return res.status(400).json({
                success: false,
                message: 'Plano inválido'
            });
        }

        const paymentId = "sim_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

        const sqlInsert = isProduction
            ? `INSERT INTO transacoes_pagamento 
               (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
               VALUES ($1, $2, $3, $4, 'simulado', $5, 'approved', CURRENT_TIMESTAMP)`
            : `INSERT INTO transacoes_pagamento 
               (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
               VALUES (?, ?, ?, ?, 'simulado', ?, 'approved', CURRENT_TIMESTAMP)`;

        await new Promise((resolve, reject) => {
            db.run(sqlInsert, [empresaIdFinal, plano, planoInfo.nome, planoInfo.valor, paymentId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const dataValidade = new Date();
        dataValidade.setMonth(dataValidade.getMonth() + 1);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = $1,
               limite_profissionais = $2,
               assinatura_ativa = true,
               assinatura_valida_ate = $3,
               ultima_cobranca = CURRENT_TIMESTAMP
               WHERE id = $4`
            : `UPDATE empresas SET 
               plano = ?,
               limite_profissionais = ?,
               assinatura_ativa = 1,
               assinatura_valida_ate = ?,
               ultima_cobranca = CURRENT_TIMESTAMP
               WHERE id = ?`;

        await new Promise((resolve, reject) => {
            db.run(sqlUpdate, [planoInfo.nome, planoInfo.limite, dataValidade.toISOString(), empresaIdFinal], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({
            success: true,
            message: `✅ Plano ${planoInfo.nome} ativado com sucesso! (Simulação)`,
            plano: planoInfo.nome,
            payment_id: paymentId,
            simulado: true
        });

    } catch (error) {
        console.error('❌ Erro na simulação:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro na simulação'
        });
    }
});

// ============================================
// POST /api/simulate-pix
// ============================================
router.post('/simulate-pix', auth, (req, res) => {
    const { plano_id, plano_nome, valor } = req.body;
    const empresaId = req.usuario.empresa_id;

    const qrCodeSimulado = `00020126580014BR.GOV.BCB.PIX0136b9f5e0-4b1e-4b3e-8a6e-8a5e4b3e2a1e5204000053039865404${Math.floor(valor * 100)}.005802BR5925See&Agende6009SAO PAULO62070503***6304E2C9`;
    const qrCodeBase64Simulado = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const paymentId = "sim_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at)
           VALUES ($1, $2, $3, $4, 'pix_simulado', $5, 'pending', $6, $7, CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at)
           VALUES (?, ?, ?, ?, 'pix_simulado', ?, 'pending', ?, ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId, qrCodeSimulado, qrCodeBase64Simulado], (err) => {
        if (err) console.error('Erro ao salvar simulação:', err);
    });

    res.json({
        success: true,
        qr_code: qrCodeSimulado,
        qr_code_base64: qrCodeBase64Simulado,
        payment_id: paymentId,
        simulado: true
    });
});

// ============================================
// POST /api/simulate-card
// ============================================
router.post('/simulate-card', auth, (req, res) => {
    const { plano_id, plano_nome, valor } = req.body;
    const empresaId = req.usuario.empresa_id;

    const paymentId = "sim_card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
           VALUES ($1, $2, $3, $4, 'cartao_simulado', $5, 'approved', CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
           VALUES (?, ?, ?, ?, 'cartao_simulado', ?, 'approved', CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId], (err) => {
        if (err) console.error('Erro ao salvar simulação:', err);
    });

    const plano = PLANOS[plano_id];
    if (plano) {
        const dataValidade = new Date();
        dataValidade.setMonth(dataValidade.getMonth() + 1);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = $1,
               limite_profissionais = $2,
               assinatura_ativa = true,
               assinatura_valida_ate = $3,
               ultima_cobranca = CURRENT_TIMESTAMP
               WHERE id = $4`
            : `UPDATE empresas SET 
               plano = ?,
               limite_profissionais = ?,
               assinatura_ativa = 1,
               assinatura_valida_ate = ?,
               ultima_cobranca = CURRENT_TIMESTAMP
               WHERE id = ?`;

        db.run(sqlUpdate, [plano.nome, plano.limite, dataValidade.toISOString(), empresaId]);
    }

    res.json({
        success: true,
        payment_id: paymentId,
        status: 'approved',
        simulado: true,
        message: 'Pagamento simulado aprovado!'
    });
});

// ============================================
// POST /api/simulate-boleto
// ============================================
router.post('/simulate-boleto', auth, (req, res) => {
    const { plano_id, plano_nome, valor, cpf } = req.body;
    const empresaId = req.usuario.empresa_id;

    const paymentId = "sim_boleto_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const boletoUrl = "https://www.mercadopago.com.br/boleto/simulado/" + paymentId;

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, boleto_url, created_at)
           VALUES ($1, $2, $3, $4, 'boleto_simulado', $5, 'pending', $6, CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, boleto_url, created_at)
           VALUES (?, ?, ?, ?, 'boleto_simulado', ?, 'pending', ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId, boletoUrl], (err) => {
        if (err) console.error('Erro ao salvar simulação:', err);
    });

    res.json({
        success: true,
        boleto_url: boletoUrl,
        payment_id: paymentId,
        simulado: true
    });
});

// ============================================
// POST /api/confirm-simulated-payment/:paymentId
// ============================================
router.post('/confirm-simulated-payment/:paymentId', auth, (req, res) => {
    const { paymentId } = req.params;

    const sqlSelect = isProduction
        ? 'SELECT empresa_id, plano_id FROM transacoes_pagamento WHERE pagamento_id = $1'
        : 'SELECT empresa_id, plano_id FROM transacoes_pagamento WHERE pagamento_id = ?';

    db.get(sqlSelect, [paymentId], (err, transacao) => {
        if (err || !transacao) {
            return res.json({ success: false, message: 'Transação não encontrada' });
        }

        const plano = PLANOS[transacao.plano_id];
        if (plano) {
            const dataValidade = new Date();
            dataValidade.setMonth(dataValidade.getMonth() + 1);

            const sqlUpdate = isProduction
                ? `UPDATE empresas SET 
                   plano = $1,
                   limite_profissionais = $2,
                   assinatura_ativa = true,
                   assinatura_valida_ate = $3,
                   ultima_cobranca = CURRENT_TIMESTAMP
                   WHERE id = $4`
                : `UPDATE empresas SET 
                   plano = ?,
                   limite_profissionais = ?,
                   assinatura_ativa = 1,
                   assinatura_valida_ate = ?,
                   ultima_cobranca = CURRENT_TIMESTAMP
                   WHERE id = ?`;

            db.run(sqlUpdate, [plano.nome, plano.limite, dataValidade.toISOString(), transacao.empresa_id]);

            const sqlUpdateTransacao = isProduction
                ? `UPDATE transacoes_pagamento 
                   SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                   WHERE pagamento_id = $1`
                : `UPDATE transacoes_pagamento 
                   SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                   WHERE pagamento_id = ?`;

            db.run(sqlUpdateTransacao, [paymentId]);

            res.json({ success: true, message: 'Pagamento confirmado!' });
        } else {
            res.json({ success: false, message: 'Plano não encontrado' });
        }
    });
});

// ============================================
// POST /api/mercadopago/webhook - CORRIGIDO
// ============================================
router.post('/mercadopago/webhook', async (req, res) => {
    try {
        console.log('📥 Webhook MercadoPago recebido:', JSON.stringify(req.body, null, 2));

        const { type, data } = req.body;

        if (type === 'payment' || type === 'payment.created' || type === 'payment.updated') {
            const paymentId = data?.id || req.body?.data?.id;

            if (!paymentId) {
                console.log('⚠️ Webhook sem ID do pagamento');
                return res.status(200).json({ success: true });
            }

            console.log(`🔍 Consultando pagamento ID: ${paymentId}`);

            // Buscar status do pagamento no Mercado Pago
            const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
            if (mpAccessToken) {
                try {
                    const mercadopago = require('mercadopago');
                    mercadopago.configure({
                        access_token: mpAccessToken
                    });

                    const response = await mercadopago.payment.findById(paymentId);
                    const payment = response.body;

                    console.log('📊 Status do pagamento:', payment.status);

                    if (payment.status === 'approved') {
                        const externalRef = payment.external_reference || '';
                        const [empresaId, planoId] = externalRef.split('_');

                        if (empresaId && planoId) {
                            console.log(`✅ Pagamento aprovado para empresa ${empresaId}, plano ${planoId}`);

                            // Definir limite baseado no plano
                            const planos = {
                                starter: 1,
                                pro: 5,
                                business: 15,
                                enterprise: 999
                            };
                            const limite = planos[planoId] || 1;

                            // Atualizar o plano da empresa
                            const sql = isProduction
                                ? `UPDATE empresas 
                                   SET plano = $1, 
                                       limite_profissionais = $2,
                                       assinatura_ativa = 1,
                                       assinatura_valida_ate = date('now', '+30 days')
                                   WHERE id = $3`
                                : `UPDATE empresas 
                                   SET plano = ?, 
                                       limite_profissionais = ?,
                                       assinatura_ativa = 1,
                                       assinatura_valida_ate = date('now', '+30 days')
                                   WHERE id = ?`;

                            db.run(sql, [planoId, limite, empresaId], function (err) {
                                if (err) {
                                    console.error('❌ Erro ao ativar plano:', err);
                                } else {
                                    console.log(`✅ Plano ${planoId} ativado para empresa ${empresaId}`);
                                }
                            });

                            // Atualizar transação
                            const sqlTransacao = isProduction
                                ? `UPDATE transacoes_pagamento 
                                   SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                                   WHERE pagamento_id = $1`
                                : `UPDATE transacoes_pagamento 
                                   SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                                   WHERE pagamento_id = ?`;

                            db.run(sqlTransacao, [paymentId]);

                            // Habilitar WhatsApp para Business/Enterprise
                            if (['business', 'enterprise'].includes(planoId)) {
                                const sqlWhats = isProduction
                                    ? 'UPDATE empresas SET whatsapp_proprio_habilitado = 1 WHERE id = $1'
                                    : 'UPDATE empresas SET whatsapp_proprio_habilitado = 1 WHERE id = ?';
                                db.run(sqlWhats, [empresaId], (err) => {
                                    if (err) console.error('Erro ao habilitar WhatsApp:', err);
                                    else console.log(`✅ WhatsApp habilitado para empresa ${empresaId}`);
                                });
                            }
                        }
                    }
                } catch (mpError) {
                    console.error('❌ Erro ao consultar Mercado Pago:', mpError);
                }
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.status(200).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/create-boleto
// ============================================
router.post('/create-boleto', auth, async (req, res) => {
    const { plano_id, plano_nome, valor } = req.body;
    const empresaId = req.usuario.empresa_id;
    const emailUsuario = req.usuario.email;

    const paymentId = "boleto_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const boletoUrl = "https://www.mercadopago.com.br/boleto/" + paymentId;

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, boleto_url, created_at)
           VALUES ($1, $2, $3, $4, 'boleto', $5, 'pending', $6, CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, boleto_url, created_at)
           VALUES (?, ?, ?, ?, 'boleto', ?, 'pending', ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId, boletoUrl], (err) => {
        if (err) console.error('Erro ao criar boleto:', err);
    });

    res.json({
        success: true,
        payment_id: paymentId,
        boleto_url: boletoUrl,
        message: 'Boleto gerado com sucesso!'
    });
});

// ============================================
// POST /api/create-pix
// ============================================
router.post('/create-pix', auth, async (req, res) => {
    const { plano_id, plano_nome, valor } = req.body;
    const empresaId = req.usuario.empresa_id;

    const paymentId = "pix_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const qrCode = `00020126580014BR.GOV.BCB.PIX0136${paymentId}5204000053039865404${Math.floor(valor * 100)}.005802BR5925See&Agende6009SAO PAULO62070503***6304E2C9`;
    const qrCodeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at)
           VALUES ($1, $2, $3, $4, 'pix', $5, 'pending', $6, $7, CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at)
           VALUES (?, ?, ?, ?, 'pix', ?, 'pending', ?, ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId, qrCode, qrCodeBase64], (err) => {
        if (err) console.error('Erro ao criar PIX:', err);
    });

    res.json({
        success: true,
        payment_id: paymentId,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        message: 'PIX gerado com sucesso!'
    });
});

// server/routes/pagamento.routes.js - CORRIGIR A DETECÇÃO DO MODO

router.post('/create-payment', auth, verificarDono, async (req, res) => {
    try {
        const { plano_id, plano_nome, valor, periodo } = req.body;
        const empresaId = req.usuario.empresa_id;

        console.log('💳 Criando checkout real:', { empresaId, plano_id, plano_nome, valor, periodo });

        const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!mpAccessToken) {
            return res.status(400).json({
                success: false,
                message: 'Pagamento real não configurado. Use o modo simulação.',
                fallback: true
            });
        }

        // 🔥 CORREÇÃO: DETECTAR MODO PELO TOKEN E PELO ENV
        const isRealToken = mpAccessToken.startsWith('APP_USR');
        const isSandboxToken = mpAccessToken.startsWith('TEST');
        const envModo = process.env.MERCADO_PAGO_ENV || 'sandbox';

        // 🔥 SE FOR TOKEN TEST, FORÇA SANDBOX
        // SE FOR TOKEN APP_USR E ENV=real, FORÇA REAL
        let isReal = false;
        if (isSandboxToken) {
            isReal = false;
            console.log('🔴 Token TEST detectado → Modo SANDBOX');
        } else if (isRealToken && envModo === 'real') {
            isReal = true;
            console.log('🔴 Token APP_USR detectado → Modo REAL');
        } else {
            isReal = false;
            console.log('🔴 Fallback → Modo SANDBOX');
        }

        console.log(`🔴 Modo final: ${isReal ? 'REAL' : 'SANDBOX'}`);

        // Criar preferência de pagamento
        const preference = {
            items: [{
                title: `Plano ${plano_nome} - ${periodo === 'anual' ? 'Anual' : 'Mensal'}`,
                description: `Assinatura do plano ${plano_nome}`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: valor
            }],
            payer: {
                email: req.usuario.email || 'cliente@email.com',
                name: req.usuario.nome || 'Cliente'
            },
            payment_methods: {
                installments: 12,
                default_installments: 1,
                excluded_payment_methods: [],
                excluded_payment_types: []
            },
            back_urls: {
                success: `${process.env.BASE_URL || 'http://localhost:3000'}/payment-success`,
                failure: `${process.env.BASE_URL || 'http://localhost:3000'}/payment-failure`,
                pending: `${process.env.BASE_URL || 'http://localhost:3000'}/payment-pending`
            },
            auto_return: 'approved',
            external_reference: `${empresaId}_${plano_id}`,
            notification_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/pagamento/mercadopago/webhook`
        };

        console.log('📤 Enviando para Mercado Pago...');

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `${empresaId}_${plano_id}_${Date.now()}`
            },
            body: JSON.stringify(preference)
        });

        const payment = await response.json();

        if (!response.ok) {
            console.error('❌ Erro Mercado Pago:', payment);
            return res.status(response.status).json({
                success: false,
                message: payment.message || 'Erro ao criar pagamento',
                error: payment
            });
        }

        console.log('✅ Pagamento criado:', payment.id);

        // 🔥 USAR O LINK CORRETO
        // Se for REAL, usar init_point
        // Se for SANDBOX, usar sandbox_init_point (ou init_point)
        let link = payment.init_point;
        if (!isReal && payment.sandbox_init_point) {
            link = payment.sandbox_init_point;
        }
        console.log('🔗 Link:', link);

        // Salvar transação
        const sql = isProduction
            ? `INSERT INTO transacoes_pagamento 
               (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
               VALUES ($1, $2, $3, $4, 'checkout', $5, 'pending', CURRENT_TIMESTAMP)`
            : `INSERT INTO transacoes_pagamento 
               (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
               VALUES (?, ?, ?, ?, 'checkout', ?, 'pending', CURRENT_TIMESTAMP)`;

        db.run(sql, [empresaId, plano_id, plano_nome, valor, payment.id], (err) => {
            if (err) console.error('❌ Erro ao salvar transação:', err);
        });

        res.json({
            success: true,
            init_point: payment.init_point,
            sandbox_init_point: payment.sandbox_init_point,
            payment_id: payment.id,
            isReal: isReal,
            link: link,
            message: 'Pagamento criado com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro ao criar pagamento:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao criar pagamento'
        });
    }
});

// ============================================
// POST /api/pagamento/webhook - ALIAS
// ============================================
router.post('/webhook', (req, res) => {
    // Redirecionar para o webhook principal
    req.url = '/mercadopago/webhook';
    router.handle(req, res);
});

module.exports = router;