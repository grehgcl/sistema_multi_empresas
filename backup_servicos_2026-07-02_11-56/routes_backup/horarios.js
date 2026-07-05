// ============================================================
// ARQUIVO: server/routes/horarios.js
// ROTAS DE HORÁRIOS - EXTRAÍDAS AUTOMATICAMENTE
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono) => {

    // ============================================
    app.get('/api/horarios', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT * FROM horarios_funcionamento WHERE empresa_id = $1 ORDER BY dia_semana`
        : `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana`;

    db.all(sql, [empresa_id], (err, horarios) => {
        if (err) {
            console.error('? Erro ao buscar hor?rios:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: horarios });
    });
});


    // ============================================
    app.put('/api/horarios/:dia', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const { dia } = req.params;
    const { aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = req.body;

    console.log('?? Atualizando hor?rio:', { empresa_id, dia, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim });

    const sqlSelect = isProduction
        ? `SELECT * FROM horarios_funcionamento WHERE empresa_id = $1 AND dia_semana = $2`
        : `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?`;

    db.get(sqlSelect, [empresa_id, dia], (err, horarioAtual) => {
        if (err) {
            console.error('? Erro ao buscar hor?rio atual:', err.message);
            return res.json({ success: false, message: 'Erro ao buscar hor?rio atual' });
        }

        const finalAberto = aberto !== undefined ? aberto : (horarioAtual?.aberto || 1);
        const finalHoraInicio = hora_inicio || horarioAtual?.hora_inicio || '09:00';
        const finalHoraFim = hora_fim || horarioAtual?.hora_fim || '18:00';
        const finalAlmocoInicio = almoco_inicio || horarioAtual?.almoco_inicio || '12:00';
        const finalAlmocoFim = almoco_fim || horarioAtual?.almoco_fim || '13:00';
        const finalIntervalo = intervalo_minutos || horarioAtual?.intervalo_minutos || 30;

        const sql = isProduction
            ? `UPDATE horarios_funcionamento 
               SET aberto = $1, 
                   hora_inicio = $2, 
                   hora_fim = $3, 
                   almoco_inicio = $4, 
                   almoco_fim = $5, 
                   intervalo_minutos = $6
               WHERE empresa_id = $7 AND dia_semana = $8`
            : `UPDATE horarios_funcionamento 
               SET aberto = ?, 
                   hora_inicio = ?, 
                   hora_fim = ?, 
                   almoco_inicio = ?, 
                   almoco_fim = ?, 
                   intervalo_minutos = ?
               WHERE empresa_id = ? AND dia_semana = ?`;

        db.run(sql, [finalAberto, finalHoraInicio, finalHoraFim, finalAlmocoInicio, finalAlmocoFim, finalIntervalo, empresa_id, dia], function (err) {
            if (err) {
                console.error('? Erro ao atualizar hor?rio:', err.message);
                return res.json({ success: false, message: 'Erro ao atualizar hor?rio: ' + err.message });
            }

            if (this && this.changes === 0) {
                const sqlInsert = isProduction
                    ? `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
                    : `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                db.run(sqlInsert, [empresa_id, dia, finalAberto, finalHoraInicio, finalHoraFim, finalAlmocoInicio, finalAlmocoFim, finalIntervalo], function (err) {
                    if (err) {
                        console.error('? Erro ao inserir hor?rio:', err.message);
                        return res.json({ success: false, message: 'Erro ao inserir hor?rio: ' + err.message });
                    }
                    res.json({ success: true, message: 'Hor?rio salvo com sucesso!' });
                });
            } else {
                res.json({ success: true, message: 'Hor?rio atualizado com sucesso!' });
            }
        });
    });
});


};
