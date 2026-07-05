// ============================================================
// ARQUIVO: server/routes/profissionais.js
// ROTAS DE PROFISSIONAIS - EXTRAÍDAS AUTOMATICAMENTE
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono, verificarLimiteProfissionais, bcrypt, gerarSenhaTemporaria) => {

    // ============================================
    app.get('/api/profissionais', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id || req.usuario.role === 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const sql = isProduction
        ? `SELECT id, nome, email, comissao_percent, ativo, created_at, telefone
           FROM profissionais WHERE empresa_id = $1 ORDER BY nome`
        : `SELECT id, nome, email, comissao_percent, ativo, created_at, telefone
           FROM profissionais WHERE empresa_id = ? ORDER BY nome`;

    db.all(sql, [empresa_id], (err, profissionais) => {
        if (err) {
            console.error('? Erro ao buscar profissionais:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: profissionais });
    });
});


    // ============================================
    app.post('/api/profissionais', auth, verificarDono, verificarLimiteProfissionais, (req, res) => {
    const { nome, email, comissao_percent, senha, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !email) {
        return res.json({ success: false, message: 'Nome e email s?o obrigat?rios' });
    }

    let senhaFinal = senha;
    let senhaGerada = false;

    if (!senhaFinal) {
        senhaFinal = gerarSenhaTemporaria();
        senhaGerada = true;
    }

    const senhaHash = bcrypt.hashSync(senhaFinal, 10);

    const sql = isProduction
        ? `INSERT INTO profissionais (nome, email, senha, comissao_percent, empresa_id, ativo, telefone) 
           VALUES ($1, $2, $3, $4, $5, 1, $6) RETURNING id`
        : `INSERT INTO profissionais (nome, email, senha, comissao_percent, empresa_id, ativo, telefone) 
           VALUES (?, ?, ?, ?, ?, 1, ?)`;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    db.run(sql, [nome, email, senhaHash, comissao_percent || 30, empresa_id, telefonePadrao], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.json({ success: false, message: 'Email j? cadastrado' });
            }
            return res.json({ success: false, message: err.message });
        }

        let id = this?.lastID || this?.id || null;
        res.json({
            success: true,
            data: { id: id, senha_temp: senhaFinal },
            message: `Profissional criado! ${senhaGerada ? `Senha tempor?ria: ${senhaFinal}` : 'Senha definida pelo dono.'}`
        });
    });
});


    // ============================================
    app.put('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, email, comissao_percent, ativo, senha, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;

    let query = isProduction
        ? `UPDATE profissionais SET nome = COALESCE($1, nome), email = COALESCE($2, email), comissao_percent = COALESCE($3, comissao_percent), ativo = COALESCE($4, ativo), telefone = COALESCE($5, telefone)`
        : `UPDATE profissionais SET nome = COALESCE(?, nome), email = COALESCE(?, email), comissao_percent = COALESCE(?, comissao_percent), ativo = COALESCE(?, ativo), telefone = COALESCE(?, telefone)`;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;
    let params = [nome, email, comissao_percent, ativo, telefonePadrao];

    if (senha && senha.trim() !== '') {
        const senhaHash = bcrypt.hashSync(senha, 10);
        query += isProduction ? `, senha = $6` : `, senha = ?`;
        params.push(senhaHash);
    }

    query += isProduction ? ` WHERE id = $${params.length + 1} AND empresa_id = $${params.length + 2}` : ` WHERE id = ? AND empresa_id = ?`;
    params.push(id, empresa_id);

    db.run(query, params, function (err) {
        if (err) return res.json({ success: false, message: err.message });

        if (senha && senha.trim() !== '') {
            res.json({ success: true, message: 'Profissional atualizado com nova senha', senha: senha });
        } else {
            res.json({ success: true, message: 'Profissional atualizado' });
        }
    });
});


    // ============================================
    app.post('/api/profissionais/:id/reset-senha', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const novaSenha = gerarSenhaTemporaria();
    const senhaHash = bcrypt.hashSync(novaSenha, 10);

    const sql = isProduction
        ? `UPDATE profissionais SET senha = $1 WHERE id = $2 AND empresa_id = $3`
        : `UPDATE profissionais SET senha = ? WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [senhaHash, id, empresa_id], function (err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: `Nova senha: ${novaSenha}`, senha: novaSenha });
    });
});


    // ============================================
    app.delete('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sqlCheck = isProduction
        ? `SELECT COUNT(*) as total FROM agendamentos WHERE profissional_id = $1`
        : `SELECT COUNT(*) as total FROM agendamentos WHERE profissional_id = ?`;

    db.get(sqlCheck, [id], (err, result) => {
        if (err) {
            console.error('? Erro ao verificar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        if (result?.total > 0) {
            const sqlUpdate = isProduction
                ? `UPDATE profissionais SET ativo = 0 WHERE id = $1 AND empresa_id = $2`
                : `UPDATE profissionais SET ativo = 0 WHERE id = ? AND empresa_id = ?`;

            db.run(sqlUpdate, [id, empresa_id], (err) => {
                if (err) {
                    console.error('? Erro ao desativar profissional:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Profissional desativado (possui agendamentos)' });
            });
        } else {
            const sqlDelete = isProduction
                ? `DELETE FROM profissionais WHERE id = $1 AND empresa_id = $2`
                : `DELETE FROM profissionais WHERE id = ? AND empresa_id = ?`;

            db.run(sqlDelete, [id, empresa_id], (err) => {
                if (err) {
                    console.error('? Erro ao excluir profissional:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Profissional removido' });
            });
        }
    });
});


};
