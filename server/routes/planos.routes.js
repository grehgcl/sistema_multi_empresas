// ============================================
// ROTAS DE PLANOS - SEE&AGENDE (SIMPLIFICADO)
// ULTIMA ATUALIZACAO: 19/08/2026
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// COMPATIBILIDADE SQLite / PostgreSQL
// ============================================

function getCurrentTimestamp() {
    return isProduction ? 'NOW()' : "datetime('now')";
}

// ============================================
// PLANOS DISPONÍVEIS (SIMPLIFICADO)
// ============================================

const PLANOS = {
    starter: { 
        nome: 'Starter', 
        limite: 1, 
        valor: 29.90, 
        dias_acesso: 30,
        agendamentos_mes: 100,
        whatsapp: false,
        promocoes: false,
        fiados: false
    },
    pro: { 
        nome: 'Pro', 
        limite: 5, 
        valor: 59.90, 
        dias_acesso: 30,
        agendamentos_mes: -1, // -1 = ilimitado
        whatsapp: true,
        promocoes: true,
        fiados: true
    }
};

// ============================================
// GET /api/planos - LISTAR PLANOS DISPONÍVEIS
// ============================================

router.get('/', auth, (req, res) => {
    res.json({
        success: true,
        data: PLANOS
    });
});

// ============================================
// GET /api/planos/empresa - BUSCAR PLANO ATUAL
// ============================================

router.get('/empresa', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    console.log('📊 Buscando plano da empresa:', empresaId);

    const sql = isProduction
        ? `SELECT id, nome, plano, limite_profissionais, assinatura_ativa, assinatura_valida_ate, trial_expira, agendamentos_mes
           FROM empresas WHERE id = ?`
        : `SELECT id, nome, plano, limite_profissionais, assinatura_ativa, assinatura_valida_ate, trial_expira, agendamentos_mes
           FROM empresas WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar plano:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar plano: ' + err.message
            });
        }

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        const isTrial = empresa.plano === 'trial';
        let diasRestantes = 0;

        if (isTrial && empresa.trial_expira) {
            const hoje = new Date();
            const expira = new Date(empresa.trial_expira);
            const diffTime = expira - hoje;
            diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        const planoInfo = PLANOS[empresa.plano] || null;
        const planoNome = planoInfo?.nome || empresa.plano || 'Trial';

        res.json({
            success: true,
            data: {
                plano: empresa.plano || 'trial',
                plano_nome: planoNome,
                limite_profissionais: empresa.limite_profissionais || 1,
                assinatura_ativa: empresa.assinatura_ativa === 1 || empresa.assinatura_ativa === true,
                assinatura_valida_ate: empresa.assinatura_valida_ate,
                trial_expira: empresa.trial_expira,
                is_trial: isTrial,
                dias_restantes: diasRestantes,
                agendamentos_mes: empresa.agendamentos_mes || 0,
                plano_info: planoInfo
            }
        });
    });
});

// ============================================
// PUT /api/planos/empresa - ATUALIZAR PLANO
// ============================================

router.put('/empresa', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { plano, assinatura_ativa, assinatura_valida_ate } = req.body;

    console.log('📝 Atualizando plano da empresa:', { empresaId, plano, assinatura_ativa, assinatura_valida_ate });

    if (!plano) {
        return res.status(400).json({
            success: false,
            message: 'Plano é obrigatório'
        });
    }

    const planosPermitidos = ['starter', 'pro', 'trial'];
    if (!planosPermitidos.includes(plano)) {
        return res.status(400).json({
            success: false,
            message: 'Plano inválido'
        });
    }

    const planoInfo = PLANOS[plano];
    let limiteProfissionais = planoInfo?.limite || 1;

    // Verificar se empresa existe
    const sqlSelect = isProduction
        ? "SELECT id FROM empresas WHERE id = ?"
        : "SELECT id FROM empresas WHERE id = ?";

    db.get(sqlSelect, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar empresa: ' + err.message
            });
        }

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        const sql = isProduction
            ? `UPDATE empresas 
               SET plano = ?, 
                   limite_profissionais = ?,
                   assinatura_ativa = ?, 
                   assinatura_valida_ate = ?
               WHERE id = ?`
            : `UPDATE empresas 
               SET plano = ?, 
                   limite_profissionais = ?,
                   assinatura_ativa = ?, 
                   assinatura_valida_ate = ?
               WHERE id = ?`;

        const params = [
            plano,
            limiteProfissionais,
            assinatura_ativa ? 1 : 0,
            assinatura_valida_ate || null,
            empresaId
        ];

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        db.run(sql, params, function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar plano:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao atualizar plano: ' + err.message
                });
            }

            // 🔥 SE FOR PLANO PRO, HABILITAR WHATSAPP
            if (plano === 'pro') {
                const sqlWhats = isProduction
                    ? 'UPDATE empresas SET whatsapp_proprio_habilitado = TRUE WHERE id = ?'
                    : 'UPDATE empresas SET whatsapp_proprio_habilitado = 1 WHERE id = ?';
                db.run(sqlWhats, [empresaId], (err) => {
                    if (err) console.error('Erro ao habilitar WhatsApp:', err);
                    else console.log(`✅ WhatsApp habilitado para empresa ${empresaId} (plano Pro)`);
                });
            } else {
                // Se for Starter ou Trial, desabilitar WhatsApp
                const sqlWhats = isProduction
                    ? 'UPDATE empresas SET whatsapp_proprio_habilitado = FALSE WHERE id = ?'
                    : 'UPDATE empresas SET whatsapp_proprio_habilitado = 0 WHERE id = ?';
                db.run(sqlWhats, [empresaId], (err) => {
                    if (err) console.error('Erro ao desabilitar WhatsApp:', err);
                    else console.log(`⚠️ WhatsApp desabilitado para empresa ${empresaId} (plano: ${plano})`);
                });
            }

            console.log(`✅ Plano da empresa ${empresaId} atualizado para ${plano}`);

            const sqlSelectUpdated = isProduction
                ? `SELECT id, nome, plano, limite_profissionais, assinatura_ativa, assinatura_valida_ate, trial_expira
                   FROM empresas WHERE id = ?`
                : `SELECT id, nome, plano, limite_profissionais, assinatura_ativa, assinatura_valida_ate, trial_expira
                   FROM empresas WHERE id = ?`;

            db.get(sqlSelectUpdated, [empresaId], (err, empresaAtualizada) => {
                if (err) {
                    console.error('❌ Erro ao buscar empresa atualizada:', err);
                    return res.json({
                        success: true,
                        message: 'Plano atualizado com sucesso!'
                    });
                }

                res.json({
                    success: true,
                    message: 'Plano atualizado com sucesso!',
                    data: empresaAtualizada
                });
            });
        });
    });
});

// ============================================
// POST /api/upgrade - UPGRADE DE PLANO
// ============================================

router.post('/upgrade', auth, verificarDono, (req, res) => {
    const { plano, metodo_pagamento, comprovante } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!PLANOS[plano]) {
        return res.status(400).json({ success: false, message: 'Plano inválido' });
    }

    const config = PLANOS[plano];
    const validaAte = new Date();
    validaAte.setDate(validaAte.getDate() + config.dias_acesso);
    const validaAteStr = validaAte.toISOString().split('T')[0];

    const sqlSelect = isProduction
        ? 'SELECT plano FROM empresas WHERE id = ?'
        : 'SELECT plano FROM empresas WHERE id = ?';

    db.get(sqlSelect, [empresaId], (err, empresaAtual) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = ?, 
               limite_profissionais = ?,
               assinatura_ativa = 1,
               assinatura_valida_ate = ?,
               trial_expira = NULL
               WHERE id = ?`
            : `UPDATE empresas SET 
               plano = ?, 
               limite_profissionais = ?,
               assinatura_ativa = 1,
               assinatura_valida_ate = ?,
               trial_expira = NULL
               WHERE id = ?`;

        db.run(sqlUpdate, [plano, config.limite, validaAteStr, empresaId], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: err.message });
            }

            // 🔥 SE FOR PRO, HABILITAR WHATSAPP
            if (plano === 'pro') {
                const sqlWhats = isProduction
                    ? 'UPDATE empresas SET whatsapp_proprio_habilitado = TRUE WHERE id = ?'
                    : 'UPDATE empresas SET whatsapp_proprio_habilitado = 1 WHERE id = ?';
                db.run(sqlWhats, [empresaId], (err) => {
                    if (err) console.error('Erro ao habilitar WhatsApp:', err);
                    else console.log(`✅ WhatsApp habilitado para empresa ${empresaId} (plano Pro)`);
                });
            }

            res.json({
                success: true,
                message: `Parabéns! Seu plano ${config.nome} foi ativado com sucesso.`,
                data: {
                    plano: plano,
                    plano_nome: config.nome,
                    limite: config.limite,
                    valida_ate: validaAteStr,
                    valor: config.valor
                }
            });
        });
    });
});

// ============================================
// POST /api/cancel-subscription - CANCELAR ASSINATURA
// ============================================

router.post('/cancel-subscription', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { motivo } = req.body;

    console.log('Cancelando assinatura da empresa:', empresaId);

    const sqlSelect = isProduction
        ? 'SELECT plano, assinatura_valida_ate FROM empresas WHERE id = ?'
        : 'SELECT plano, assinatura_valida_ate FROM empresas WHERE id = ?';

    db.get(sqlSelect, [empresaId], (err, empresa) => {
        if (err) {
            console.error('Erro ao buscar empresa:', err);
            return res.json({ success: false, message: 'Erro ao buscar dados da empresa' });
        }

        if (!empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }

        if (empresa.plano === 'trial') {
            return res.json({ success: false, message: 'Você já está no plano Trial' });
        }

        const dataTrialExpira = new Date();
        dataTrialExpira.setDate(dataTrialExpira.getDate() + 7);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = 'trial',
               limite_profissionais = 1,
               assinatura_ativa = 0,
               assinatura_valida_ate = NULL,
               trial_expira = ?
               WHERE id = ?`
            : `UPDATE empresas SET 
               plano = 'trial',
               limite_profissionais = 1,
               assinatura_ativa = 0,
               assinatura_valida_ate = NULL,
               trial_expira = ?
               WHERE id = ?`;

        db.run(sqlUpdate, [dataTrialExpira.toISOString(), empresaId], function (err) {
            if (err) {
                console.error('Erro ao cancelar assinatura:', err);
                return res.json({ success: false, message: 'Erro ao cancelar assinatura' });
            }

            // Desabilitar WhatsApp
            const sqlWhats = isProduction
                ? 'UPDATE empresas SET whatsapp_proprio_habilitado = FALSE WHERE id = ?'
                : 'UPDATE empresas SET whatsapp_proprio_habilitado = 0 WHERE id = ?';
            db.run(sqlWhats, [empresaId], (err) => {
                if (err) console.error('Erro ao desabilitar WhatsApp:', err);
            });

            res.json({
                success: true,
                message: `Assinatura cancelada! Você tem 7 dias de acesso ao plano Trial.`,
                dias_trial: 7
            });
        });
    });
});

module.exports = router;