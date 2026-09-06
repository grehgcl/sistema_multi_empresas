// server/routes/planos.routes.js
// ============================================
// ROTAS DE PLANOS - SEE&AGENDE
// Versão com modo de pagamento do banco
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono, verificarSuperAdmin } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// server/routes/planos.routes.js
// ============================================
// MODO DE PAGAMENTO - Usando o banco
// ============================================

function getPaymentModeFromDB(callback) {
    const createTableSQL = isProduction
        ? `CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    db.run(createTableSQL, [], (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela configuracoes:', err);
            return callback('simulation');
        }

        const sql = 'SELECT valor FROM configuracoes WHERE chave = "payment_mode"';
        db.get(sql, [], (err, row) => {
            if (err) {
                console.error('❌ Erro ao buscar modo de pagamento:', err);
                return callback('simulation');
            }

            if (row) {
                console.log(`📊 Modo de pagamento (banco): ${row.valor}`);
                return callback(row.valor);
            }

            // Definir padrão baseado no .env
            const defaultMode = process.env.PAYMENT_MODE === 'real' ? 'real' : 'simulation';
            console.log(`📊 Modo padrão (env): ${defaultMode}`);
            
            const sqlInsert = isProduction
                ? `INSERT INTO configuracoes (chave, valor) 
                   VALUES ('payment_mode', ?) 
                   ON CONFLICT (chave) DO NOTHING`
                : `INSERT OR IGNORE INTO configuracoes (chave, valor) 
                   VALUES ('payment_mode', ?)`;

            db.run(sqlInsert, [defaultMode], () => {
                callback(defaultMode);
            });
        });
    });
}

// ============================================
// PLANOS DISPONÍVEIS
// ============================================
const PLANOS = Object.freeze({
    trial: {
        id: 'trial', nome: 'Trial (Starter)', limite: 1, valor: 0,
        dias_acesso: 45, agendamentos_mes: 100,
        whatsapp: false, promocoes: false, fiados: false
    },
    starter: {
        id: 'starter', nome: 'Starter', limite: 1, valor: 29.90,
        dias_acesso: 30, agendamentos_mes: 100,
        whatsapp: false, promocoes: false, fiados: false
    },
    pro: {
        id: 'pro', nome: 'Pro', limite: 5, valor: 59.90,
        dias_acesso: 30, agendamentos_mes: -1,
        whatsapp: true, promocoes: true, fiados: true
    },
    // 🔥 NOVO PLANO DE TESTE R$ 1,00
    teste: {
        id: 'teste', nome: 'Teste R$ 1,00', limite: 1, valor: 1.00,
        dias_acesso: 1, agendamentos_mes: 10,
        whatsapp: false, promocoes: false, fiados: false
    }
});

function normalizarPlano(plano) {
    const valor = String(plano || 'trial').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(PLANOS, valor) ? valor : 'trial';
}

function booleano(valor) {
    return valor === true || valor === 1 || valor === '1';
}

function dataValida(valor) {
    if (!valor) return false;
    const data = new Date(valor);
    return !Number.isNaN(data.getTime());
}

function diasAte(valor) {
    if (!dataValida(valor)) return 0;
    const hoje = new Date();
    const fim = new Date(valor);
    return Math.max(0, Math.ceil((fim - hoje) / 86400000));
}

function adicionarDias(dias) {
    const data = new Date();
    data.setDate(data.getDate() + Number(dias));
    return data.toISOString().split('T')[0];
}

function assinaturaAtiva(empresa, plano) {
    if (!booleano(empresa.assinatura_ativa)) return false;
    if (!['starter', 'pro'].includes(plano)) return false;
    return dataValida(empresa.assinatura_valida_ate) && diasAte(empresa.assinatura_valida_ate) > 0;
}

function montarResposta(empresa) {
    const plano = normalizarPlano(empresa.plano);
    const config = PLANOS[plano];
    const isTrial = plano === 'trial';
    const ativa = assinaturaAtiva(empresa, plano);
    const validade = isTrial ? empresa.trial_expira : empresa.assinatura_valida_ate;
    const diasRestantes = diasAte(validade);
    const whatsappPermitido = plano === 'pro' && ativa && booleano(empresa.whatsapp_proprio_habilitado);

    return {
        plano,
        plano_display: config.nome,
        plano_nome: config.nome,
        is_trial: isTrial,
        dias_restantes: diasRestantes,
        data_validade: validade || null,
        data_validade_formatada: dataValida(validade)
            ? new Date(validade).toLocaleDateString('pt-BR')
            : 'N/A',
        limite_profissionais: config.limite,
        assinatura_ativa: ativa,
        assinatura_valida_ate: empresa.assinatura_valida_ate || null,
        trial_expira: empresa.trial_expira || null,
        agendamentos_mes: config.agendamentos_mes,
        plano_info: config,
        whatsapp: {
            habilitado: whatsappPermitido,
            instance: whatsappPermitido ? (empresa.whatsapp_instance || null) : null,
            connected: whatsappPermitido && booleano(empresa.whatsapp_connected)
        }
    };
}

function buscarEmpresa(empresaId, callback) {
    const sql = `SELECT id, nome, plano, limite_profissionais, assinatura_ativa,
        assinatura_valida_ate, trial_expira, agendamentos_mes,
        whatsapp_proprio_habilitado, whatsapp_instance, whatsapp_connected, created_at
        FROM empresas WHERE id = ?`;
    db.get(sql, [empresaId], callback);
}

function atualizarWhatsApp(empresaId, habilitado, callback = () => {}) {
    db.run(
        'UPDATE empresas SET whatsapp_proprio_habilitado = ?, whatsapp_instance = CASE WHEN ? = 0 THEN NULL ELSE whatsapp_instance END WHERE id = ?',
        [habilitado ? 1 : 0, habilitado ? 1 : 0, empresaId],
        callback
    );
}

// ============================================
// MODO DE PAGAMENTO - AGORA VEM DO BANCO
// ============================================
router.get('/payment-mode', auth, (req, res) => {
    getPaymentModeFromDB((mode) => {
        res.json({ 
            success: true, 
            data: { 
                mode: mode,
                isReal: mode === 'real',
                isSimulation: mode === 'simulation'
            } 
        });
    });
});

// ============================================
// LISTAR PLANOS
// ============================================
router.get('/', auth, (req, res) => {
    res.json({ success: true, data: PLANOS });
});

// ============================================
// PLANO ATUAL DA EMPRESA
// ============================================
router.get('/empresa', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    buscarEmpresa(empresaId, (err, empresa) => {
        if (err) {
            console.error('Erro ao buscar plano:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar plano' });
        }
        if (!empresa) return res.status(404).json({ success: false, message: 'Empresa não encontrada' });

        const data = montarResposta(empresa);
        res.json({ success: true, data });
    });
});

// ============================================
// ATUALIZAÇÃO MANUAL — AGORA USA O MODO DO BANCO
// ============================================
router.put('/empresa', auth, verificarDono, (req, res) => {
    getPaymentModeFromDB((paymentMode) => {
        const isSimulation = paymentMode === 'simulation';
        
        if (!isSimulation) {
            return res.status(403).json({
                success: false,
                message: 'Ativação manual bloqueada. Aguarde a confirmação do pagamento.'
            });
        }

        const empresaId = req.usuario.empresa_id;
        const plano = normalizarPlano(req.body.plano);
        const periodo = req.body.periodo === 'anual' ? 'anual' : 'mensal';
        const config = PLANOS[plano];
        const ativa = plano !== 'trial';
        const validade = ativa ? adicionarDias(periodo === 'anual' ? 365 : config.dias_acesso) : null;
        const trialExpira = plano === 'trial' ? (req.body.trial_expira || adicionarDias(7)) : null;

        buscarEmpresa(empresaId, (err, empresa) => {
            if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar empresa' });
            if (!empresa) return res.status(404).json({ success: false, message: 'Empresa não encontrada' });

            const sql = `UPDATE empresas SET plano = ?, limite_profissionais = ?,
                assinatura_ativa = ?, assinatura_valida_ate = ?, trial_expira = ?
                WHERE id = ?`;
            db.run(sql, [plano, config.limite, ativa ? 1 : 0, validade, trialExpira, empresaId], function (updateErr) {
                if (updateErr) {
                    console.error('Erro ao atualizar plano:', updateErr);
                    return res.status(500).json({ success: false, message: 'Erro ao atualizar plano' });
                }

                atualizarWhatsApp(empresaId, plano === 'pro' && ativa, () => {
                    buscarEmpresa(empresaId, (readErr, atualizada) => {
                        if (readErr || !atualizada) {
                            return res.status(500).json({ success: false, message: 'Plano atualizado, mas não foi possível recarregar os dados' });
                        }
                        res.json({ success: true, message: 'Plano atualizado com sucesso', data: montarResposta(atualizada) });
                    });
                });
            });
        });
    });
});

// ============================================
// UPGRADE DE TESTE
// ============================================
router.post('/upgrade', auth, verificarDono, (req, res) => {
    getPaymentModeFromDB((paymentMode) => {
        if (paymentMode === 'real') {
            return res.status(403).json({ 
                success: false, 
                message: 'Use o fluxo de pagamento real.' 
            });
        }

        req.body = { ...req.body, plano: req.body.plano, periodo: req.body.periodo };
        return router.handle({ ...req, method: 'PUT', url: '/empresa', originalUrl: '/empresa' }, res, () => {});
    });
});

// ============================================
// CANCELAR ASSINATURA
// ============================================
router.post('/cancel-subscription', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const trialExpira = adicionarDias(7);
    const sql = `UPDATE empresas SET plano = 'trial', limite_profissionais = 1,
        assinatura_ativa = 0, assinatura_valida_ate = NULL,
        trial_expira = ?, whatsapp_proprio_habilitado = 0,
        whatsapp_instance = NULL, whatsapp_connected = 0
        WHERE id = ?`;

    db.run(sql, [trialExpira, empresaId], function (err) {
        if (err) {
            console.error('Erro ao cancelar assinatura:', err);
            return res.status(500).json({ success: false, message: 'Erro ao cancelar assinatura' });
        }
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        res.json({ success: true, message: 'Assinatura cancelada. Você tem 7 dias de acesso ao Trial.', dias_trial: 7 });
    });
});

// ============================================
// SUPER ADMIN — WHATSAPP (ATIVA EM QUALQUER PLANO)
// ============================================
router.post('/admin/ativar-whatsapp/:id', auth, verificarSuperAdmin, async (req, res) => {
    const empresaId = req.params.id;
    const habilitar = req.body.habilitar === true || req.body.habilitar === 1;

    buscarEmpresa(empresaId, async (err, empresa) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar empresa' });
        if (!empresa) return res.status(404).json({ success: false, message: 'Empresa não encontrada' });

        // 🔥 REMOVEU A VERIFICAÇÃO DE PLANO PRO!
        // Agora Super Admin pode ativar em qualquer plano
        
        // Verifica se a empresa existe (já fez)
        // E atualiza o WhatsApp
        atualizarWhatsApp(empresaId, habilitar, (updateErr) => {
            if (updateErr) return res.status(500).json({ success: false, message: 'Erro ao atualizar WhatsApp' });
            
            const plano = normalizarPlano(empresa.plano);
            res.json({ 
                success: true, 
                message: habilitar ? '✅ WhatsApp habilitado com sucesso!' : '❌ WhatsApp desabilitado',
                plano: plano,
                whatsapp_habilitado: habilitar
            });
        });
    });
});
module.exports = router;