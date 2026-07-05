// ============================================================
// ARQUIVO: server/routes/servicos.js
// ROTAS DE SERVIÇOS
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono) => {

    // ============================================
    app.get('/api/servicos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id) return res.json({ success: true, data: [] });

    const sql = isProduction
        ? `SELECT * FROM servicos WHERE empresa_id = $1 AND ativo = 1 ORDER BY nome`
        : `SELECT * FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome`;

    db.all(sql, [empresa_id], (err, servicos) => {
        if (err) {
            console.error('? Erro ao buscar servi?os:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: servicos });
    });
});


    // ============================================
    app.get('/api/servicos/todos', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT * FROM servicos WHERE empresa_id = $1 ORDER BY nome`
        : `SELECT * FROM servicos WHERE empresa_id = ? ORDER BY nome`;

    db.all(sql, [empresa_id], (err, servicos) => {
        if (err) {
            console.error('? Erro ao buscar todos servi?os:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: servicos });
    });
});


    // ============================================
    app.post('/api/servicos', auth, verificarDono, (req, res) => {
    const { nome, descricao, valor, duracao } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !valor) {
        return res.json({ success: false, message: 'Nome e valor s?o obrigat?rios' });
    }

    const sql = isProduction
        ? `INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) 
           VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`
        : `INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) 
           VALUES (?, ?, ?, ?, ?, 1)`;

    db.run(sql, [nome, descricao || '', valor, duracao || 30, empresa_id], function (err) {
        if (err) {
            console.error('? Erro ao criar servi?o:', err.message);
            return res.json({ success: false, message: err.message });
        }

        let id = this?.lastID || this?.id || null;
        res.json({ success: true, data: { id: id }, message: 'Servi?o cadastrado' });
    });
});


    // ============================================
    app.put('/api/servicos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, descricao, valor, duracao, ativo } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `UPDATE servicos SET 
           nome = COALESCE($1, nome), 
           descricao = COALESCE($2, descricao), 
           valor = COALESCE($3, valor), 
           duracao = COALESCE($4, duracao), 
           ativo = COALESCE($5, ativo) 
           WHERE id = $6 AND empresa_id = $7`
        : `UPDATE servicos SET 
           nome = COALESCE(?, nome), 
           descricao = COALESCE(?, descricao), 
           valor = COALESCE(?, valor), 
           duracao = COALESCE(?, duracao), 
           ativo = COALESCE(?, ativo) 
           WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [nome, descricao, valor, duracao, ativo, id, empresa_id], function (err) {
        if (err) {
            console.error('? Erro ao editar servi?o:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Servi?o atualizado' });
    });
});


    // ============================================
    app.delete('/api/servicos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sqlCheck = isProduction
        ? `SELECT COUNT(*) as total FROM agendamentos WHERE servico_id = $1`
        : `SELECT COUNT(*) as total FROM agendamentos WHERE servico_id = ?`;

    db.get(sqlCheck, [id], (err, result) => {
        if (err) {
            console.error('? Erro ao verificar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        if (result?.total > 0) {
            const sqlUpdate = isProduction
                ? `UPDATE servicos SET ativo = 0 WHERE id = $1 AND empresa_id = $2`
                : `UPDATE servicos SET ativo = 0 WHERE id = ? AND empresa_id = ?`;

            db.run(sqlUpdate, [id, empresa_id], (err) => {
                if (err) {
                    console.error('? Erro ao desativar servi?o:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Servi?o desativado (possui agendamentos)' });
            });
        } else {
            const sqlDelete = isProduction
                ? `DELETE FROM servicos WHERE id = $1 AND empresa_id = $2`
                : `DELETE FROM servicos WHERE id = ? AND empresa_id = ?`;

            db.run(sqlDelete, [id, empresa_id], (err) => {
                if (err) {
                    console.error('? Erro ao excluir servi?o:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Servi?o removido' });
            });
        }
    });
});


};
