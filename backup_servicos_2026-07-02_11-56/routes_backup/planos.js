// ============================================================
// ARQUIVO: server/routes/planos.js
// ROTAS DE PLANOS - EXTRAÍDAS AUTOMATICAMENTE
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono, PLANOS, PLANOS_NOMES, bcrypt) => {

    // ============================================
    app.post('/api/upgrade', auth, verificarDono, (req, res) => {
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
        ? 'SELECT plano FROM empresas WHERE id = $1'
        : 'SELECT plano FROM empresas WHERE id = ?';

    db.get(sqlSelect, [empresaId], (err, empresaAtual) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = $1, 
               limite_profissionais = $2,
               assinatura_ativa = 1,
               assinatura_valida_ate = $3,
               trial_expira = NULL
               WHERE id = $4`
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

            const sqlHistorico = isProduction
                ? `INSERT INTO planos_historico 
                   (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante)
                   VALUES ($1, $2, $3, $4, $5, $6)`
                : `INSERT INTO planos_historico 
                   (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante)
                   VALUES (?, ?, ?, ?, ?, ?)`;

            db.run(sqlHistorico, [empresaId, empresaAtual?.plano || 'trial', plano, config.valor, metodo_pagamento || 'manual', comprovante || null], (err) => {
                if (err) console.error('Erro ao salvar histórico:', err);
            });

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
    app.post('/api/cancel-subscription', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { motivo } = req.body;

    console.log('Cancelando assinatura da empresa:', empresaId);

    const sqlSelect = isProduction
        ? 'SELECT plano, assinatura_valida_ate FROM empresas WHERE id = $1'
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

        const sqlHistorico = isProduction
            ? `INSERT INTO planos_historico 
               (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca)
               VALUES ($1, $2, 'cancelado', 0, 'cancelamento', $3, CURRENT_TIMESTAMP)`
            : `INSERT INTO planos_historico 
               (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca)
               VALUES (?, ?, 'cancelado', 0, 'cancelamento', ?, CURRENT_TIMESTAMP)`;

        db.run(sqlHistorico, [empresaId, empresa.plano, motivo || 'Usuário cancelou assinatura'], (err) => {
            if (err) console.error('Erro ao registrar cancelamento:', err);
        });

        const dataTrialExpira = new Date();
        dataTrialExpira.setDate(dataTrialExpira.getDate() + 7);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = 'trial',
               limite_profissionais = 1,
               assinatura_ativa = 0,
               assinatura_valida_ate = NULL,
               trial_expira = $1
               WHERE id = $2`
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

            res.json({
                success: true,
                message: `Assinatura cancelada! Você tem 7 dias de acesso ao plano Trial até ${dataTrialExpira.toLocaleDateString('pt-BR')}.`,
                dias_trial: 7
            });
        });
    });
});


    // ============================================
    app.post('/api/simulate-downgrade', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const dataTrialExpira = new Date();
    dataTrialExpira.setDate(dataTrialExpira.getDate() + 45);

    const sql = isProduction
        ? `UPDATE empresas SET 
           plano = 'trial',
           limite_profissionais = 1,
           assinatura_ativa = 0,
           assinatura_valida_ate = NULL,
           trial_expira = $1
           WHERE id = $2`
        : `UPDATE empresas SET 
           plano = 'trial',
           limite_profissionais = 1,
           assinatura_ativa = 0,
           assinatura_valida_ate = NULL,
           trial_expira = ?
           WHERE id = ?`;

    db.run(sql, [dataTrialExpira.toISOString(), empresaId], function (err) {
        if (err) {
            return res.json({ success: false, message: 'Erro ao voltar para trial' });
        }
        res.json({ success: true, message: `Voltou para o plano Trial com 45 dias! Válido até ${dataTrialExpira.toLocaleDateString('pt-BR')}` });
    });
});


    // ============================================
    app.post('/api/simulate-pix', auth, (req, res) => {
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
    app.post('/api/simulate-card', auth, (req, res) => {
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
               assinatura_ativa = 1,
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
    app.post('/api/simulate-boleto', auth, (req, res) => {
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
    app.post('/api/confirm-simulated-payment/:paymentId', auth, (req, res) => {
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
                   assinatura_ativa = 1,
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


};
