// ============================================
// ROTAS DE HORÁRIOS - SEE&AGENDE (CORRIGIDO)
// ============================================

const express = require('express');
const router = express.Router();
const { getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

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
// 🚫 BLOQUEIOS DE AGENDA
// ============================================

// --------------------------------------------
// GET /api/horarios/bloqueios
// Lista bloqueios. Query params opcionais:
//   ?profissional_id=X  (filtra por profissional, inclui globais)
//   ?de=YYYY-MM-DD&ate=YYYY-MM-DD  (filtra por período)
// --------------------------------------------
router.get('/bloqueios', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    const { profissional_id, de, ate } = req.query;

    let sql = `
        SELECT b.*, p.nome AS profissional_nome
        FROM bloqueios_agenda b
        LEFT JOIN profissionais p ON p.id = b.profissional_id
        WHERE b.empresa_id = ? AND b.ativo = 1
    `;
    const params = [empresaId];

    if (profissional_id) {
        sql += ` AND (b.profissional_id = ? OR b.profissional_id IS NULL)`;
        params.push(parseInt(profissional_id));
    }

    if (de) {
        sql += ` AND (b.data_fim IS NULL OR b.data_fim >= ?)`;
        params.push(de);
    }

    if (ate) {
        sql += ` AND b.data_inicio <= ?`;
        params.push(ate);
    }

    sql += ` ORDER BY b.data_inicio ASC, b.created_at DESC`;

    empresaDb.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao listar bloqueios:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        const bloqueios = (rows || []).map(b => ({
            ...b,
            dia_inteiro: b.dia_inteiro === 1 || b.dia_inteiro === true,
            datas_especificas: (() => {
                try { return JSON.parse(b.datas_especificas || '[]'); }
                catch { return []; }
            })()
        }));

        res.json({ success: true, data: bloqueios });
    });
});

// --------------------------------------------
// POST /api/horarios/bloqueios
// Cria um novo bloqueio
// --------------------------------------------
router.post('/bloqueios', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const usuarioId = req.usuario.id;
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    const {
        tipo = 'periodo',
        data_inicio,
        data_fim,
        datas_especificas = [],
        dia_inteiro = true,
        hora_inicio,
        hora_fim,
        profissional_id = null,
        motivo = ''
    } = req.body;

    // Validações
    if (tipo === 'periodo' && !data_inicio) {
        return res.status(400).json({ success: false, message: 'Informe data início' });
    }
    if (tipo === 'periodo' && !data_fim) {
        return res.status(400).json({ success: false, message: 'Informe data fim do período' });
    }
    if (tipo === 'periodo' && data_fim < data_inicio) {
        return res.status(400).json({ success: false, message: 'Data fim não pode ser antes da data início' });
    }
    if (tipo === 'datas' && (!datas_especificas || datas_especificas.length === 0)) {
        return res.status(400).json({ success: false, message: 'Adicione pelo menos uma data' });
    }
    if (!dia_inteiro && (!hora_inicio || !hora_fim)) {
        return res.status(400).json({ success: false, message: 'Informe horário início e fim' });
    }
    if (!dia_inteiro && hora_fim <= hora_inicio) {
        return res.status(400).json({ success: false, message: 'Hora fim deve ser após a hora início' });
    }

    const dataInicioFinal = tipo === 'periodo'
        ? data_inicio
        : (datas_especificas[0] || data_inicio);

    const sql = `
        INSERT INTO bloqueios_agenda 
        (empresa_id, profissional_id, tipo, data_inicio, data_fim, datas_especificas,
         dia_inteiro, hora_inicio, hora_fim, motivo, criado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        empresaId,
        profissional_id || null,
        tipo,
        dataInicioFinal,
        tipo === 'periodo' ? data_fim : null,
        JSON.stringify(datas_especificas || []),
        dia_inteiro ? 1 : 0,
        dia_inteiro ? null : hora_inicio,
        dia_inteiro ? null : hora_fim,
        motivo || '',
        usuarioId
    ];

    empresaDb.run(sql, params, function (err) {
        if (err) {
            console.error('❌ Erro ao criar bloqueio:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        res.json({
            success: true,
            message: 'Bloqueio criado com sucesso!',
            id: this.lastID
        });
    });
});

// --------------------------------------------
// PUT /api/horarios/bloqueios/:id
// Edita um bloqueio existente
// --------------------------------------------
router.put('/bloqueios/:id', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const bloqueioId = parseInt(req.params.id);
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    empresaDb.get(
        'SELECT id FROM bloqueios_agenda WHERE id = ? AND empresa_id = ?',
        [bloqueioId, empresaId],
        (err, row) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!row) return res.status(404).json({ success: false, message: 'Bloqueio não encontrado' });

            const {
                tipo, data_inicio, data_fim, datas_especificas,
                dia_inteiro, hora_inicio, hora_fim,
                profissional_id, motivo
            } = req.body;

            const updates = [];
            const params = [];

            if (tipo !== undefined) { updates.push('tipo = ?'); params.push(tipo); }
            if (data_inicio !== undefined) { updates.push('data_inicio = ?'); params.push(data_inicio); }
            if (data_fim !== undefined) { updates.push('data_fim = ?'); params.push(data_fim); }
            if (datas_especificas !== undefined) {
                updates.push('datas_especificas = ?');
                params.push(JSON.stringify(datas_especificas));
            }
            if (dia_inteiro !== undefined) {
                updates.push('dia_inteiro = ?');
                params.push(dia_inteiro ? 1 : 0);
            }
            if (hora_inicio !== undefined) { updates.push('hora_inicio = ?'); params.push(hora_inicio); }
            if (hora_fim !== undefined) { updates.push('hora_fim = ?'); params.push(hora_fim); }
            if (profissional_id !== undefined) {
                updates.push('profissional_id = ?');
                params.push(profissional_id || null);
            }
            if (motivo !== undefined) { updates.push('motivo = ?'); params.push(motivo); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'Nada para atualizar' });
            }

            params.push(bloqueioId, empresaId);
            const sql = `UPDATE bloqueios_agenda SET ${updates.join(', ')} WHERE id = ? AND empresa_id = ?`;

            empresaDb.run(sql, params, function (err) {
                if (err) {
                    console.error('❌ Erro ao atualizar bloqueio:', err);
                    return res.status(500).json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Bloqueio atualizado!' });
            });
        }
    );
});

// --------------------------------------------
// DELETE /api/horarios/bloqueios/:id
// Remove um bloqueio
// --------------------------------------------
router.delete('/bloqueios/:id', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const bloqueioId = parseInt(req.params.id);
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    empresaDb.run(
        'DELETE FROM bloqueios_agenda WHERE id = ? AND empresa_id = ?',
        [bloqueioId, empresaId],
        function (err) {
            if (err) {
                console.error('❌ Erro ao excluir bloqueio:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Bloqueio não encontrado' });
            }
            res.json({ success: true, message: 'Bloqueio removido!' });
        }
    );
});

// ============================================
// GET /api/horarios
// ============================================

router.get('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const empresaDb = getEmpresaDb(empresaId);

    const sql = "SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana";

    empresaDb.all(sql, [empresaId], (err, horarios) => {
        if (err) {
            console.error("Erro ao buscar horarios:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: horarios || []
        });
    });
});

// ============================================
// PUT /api/horarios/:dia - Atualizar horário (INTELIGENTE)
// ============================================

router.put('/:dia', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const empresaDb = getEmpresaDb(empresaId);
    const { dia } = req.params;
    const { aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = req.body;

    const diaNum = parseInt(dia);
    if (isNaN(diaNum) || diaNum < 0 || diaNum > 6) {
        return res.status(400).json({
            success: false,
            message: 'Dia inválido'
        });
    }

    // 🔥 BUSCAR O HORÁRIO ATUAL PRIMEIRO
    empresaDb.get('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?',
        [empresaId, diaNum], (err, horarioAtual) => {
            if (err) {
                console.error("❌ Erro ao buscar horario:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            // Se não existir, criar com valores padrão
            if (!horarioAtual) {
                console.log(`🆕 Criando horário para dia ${diaNum}`);
                empresaDb.run(`
                    INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    empresaId,
                    diaNum,
                    aberto !== undefined ? (aberto ? 1 : 0) : 1,
                    hora_inicio || '08:00',
                    hora_fim || '18:00',
                    almoco_inicio || '12:00',
                    almoco_fim || '13:00',
                    intervalo_minutos || 30
                ],
                    function (err) {
                        if (err) {
                            console.error("❌ Erro ao criar horario:", err);
                            return res.status(500).json({
                                success: false,
                                message: err.message
                            });
                        }
                        res.json({
                            success: true,
                            message: 'Horário criado com sucesso!'
                        });
                    });
                return;
            }

            // 🔥 CONSTRUIR UPDATE DINÂMICO (SÓ OS CAMPOS QUE VIERAM)
            let updates = [];
            let params = [];

            if (aberto !== undefined) {
                updates.push('aberto = ?');
                params.push(aberto ? 1 : 0);
            }

            if (hora_inicio !== undefined && hora_inicio !== null && hora_inicio !== '') {
                updates.push('hora_inicio = ?');
                params.push(hora_inicio);
            }

            if (hora_fim !== undefined && hora_fim !== null && hora_fim !== '') {
                updates.push('hora_fim = ?');
                params.push(hora_fim);
            }

            if (almoco_inicio !== undefined && almoco_inicio !== null && almoco_inicio !== '') {
                updates.push('almoco_inicio = ?');
                params.push(almoco_inicio);
            }

            if (almoco_fim !== undefined && almoco_fim !== null && almoco_fim !== '') {
                updates.push('almoco_fim = ?');
                params.push(almoco_fim);
            }

            if (intervalo_minutos !== undefined && intervalo_minutos !== null && intervalo_minutos !== '') {
                updates.push('intervalo_minutos = ?');
                params.push(parseInt(intervalo_minutos));
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum campo para atualizar'
                });
            }

            params.push(empresaId, diaNum);
            const sql = `UPDATE horarios_funcionamento SET ${updates.join(', ')} WHERE empresa_id = ? AND dia_semana = ?`;

            console.log(`📝 Atualizando dia ${diaNum}:`, updates);

            empresaDb.run(sql, params, function (err) {
                if (err) {
                    console.error("❌ Erro ao atualizar horario:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                console.log(`✅ Horário do dia ${diaNum} atualizado com sucesso!`);
                res.json({
                    success: true,
                    message: 'Horário atualizado com sucesso!'
                });
            });
        });
});

// ============================================
// POST /api/horarios (BULK CREATE/UPDATE)
// ============================================

router.post('/', auth, verificarDono, (req, res) => {
    const { horarios } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!horarios || !Array.isArray(horarios)) {
        return res.status(400).json({
            success: false,
            message: 'Lista de horarios invalida'
        });
    }

    const empresaDb = getEmpresaDb(empresaId);

    let processados = 0;

    for (const horario of horarios) {
        const { dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = horario;

        empresaDb.get(
            `SELECT id FROM horarios_funcionamento WHERE dia_semana = ? AND empresa_id = ?`,
            [dia_semana, empresaId],
            (err, row) => {
                if (err) {
                    console.error("❌ Erro ao verificar horario:", err);
                    return;
                }

                if (row) {
                    empresaDb.run(
                        `UPDATE horarios_funcionamento 
                         SET aberto = ?, hora_inicio = ?, hora_fim = ?, almoco_inicio = ?, almoco_fim = ?, intervalo_minutos = ?
                         WHERE dia_semana = ? AND empresa_id = ?`,
                        [
                            aberto !== undefined ? (aberto ? 1 : 0) : 1,
                            hora_inicio || '09:00',
                            hora_fim || '18:00',
                            almoco_inicio || '12:00',
                            almoco_fim || '13:00',
                            intervalo_minutos || 30,
                            dia_semana,
                            empresaId
                        ],
                        function(err) {
                            if (err) {
                                console.error("❌ Erro ao atualizar horario:", err);
                            }
                            processados++;
                            if (processados === horarios.length) {
                                res.json({
                                    success: true,
                                    message: 'Horarios salvos com sucesso!'
                                });
                            }
                        }
                    );
                } else {
                    empresaDb.run(
                        `INSERT INTO horarios_funcionamento 
                         (dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos, empresa_id)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            dia_semana,
                            aberto !== undefined ? (aberto ? 1 : 0) : 1,
                            hora_inicio || '09:00',
                            hora_fim || '18:00',
                            almoco_inicio || '12:00',
                            almoco_fim || '13:00',
                            intervalo_minutos || 30,
                            empresaId
                        ],
                        function(err) {
                            if (err) {
                                console.error("❌ Erro ao inserir horario:", err);
                            }
                            processados++;
                            if (processados === horarios.length) {
                                res.json({
                                    success: true,
                                    message: 'Horarios salvos com sucesso!'
                                });
                            }
                        }
                    );
                }
            }
        );
    }

    if (horarios.length === 0) {
        res.json({
            success: true,
            message: 'Nenhum horário para salvar'
        });
    }
});

// ============================================
// POST /api/horarios/inicializar - Horários padrão
// ============================================

router.post('/inicializar', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const empresaDb = getEmpresaDb(empresaId);

    const horariosPadrao = [
        { dia_semana: 1, aberto: 1, hora_inicio: '08:00', hora_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', intervalo_minutos: 30 },
        { dia_semana: 2, aberto: 1, hora_inicio: '08:00', hora_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', intervalo_minutos: 30 },
        { dia_semana: 3, aberto: 1, hora_inicio: '08:00', hora_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', intervalo_minutos: 30 },
        { dia_semana: 4, aberto: 1, hora_inicio: '08:00', hora_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', intervalo_minutos: 30 },
        { dia_semana: 5, aberto: 1, hora_inicio: '08:00', hora_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', intervalo_minutos: 30 },
        { dia_semana: 6, aberto: 1, hora_inicio: '08:00', hora_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', intervalo_minutos: 30 },
        { dia_semana: 0, aberto: 0, hora_inicio: null, hora_fim: null, almoco_inicio: null, almoco_fim: null, intervalo_minutos: 30 }
    ];

    empresaDb.run(
        `DELETE FROM horarios_funcionamento WHERE empresa_id = ?`,
        [empresaId],
        (err) => {
            if (err) {
                console.error("❌ Erro ao limpar horarios:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            let inseridos = 0;

            for (const horario of horariosPadrao) {
                empresaDb.run(
                    `INSERT INTO horarios_funcionamento 
                     (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        empresaId,
                        horario.dia_semana,
                        horario.aberto,
                        horario.hora_inicio,
                        horario.hora_fim,
                        horario.almoco_inicio,
                        horario.almoco_fim,
                        horario.intervalo_minutos
                    ],
                    function(err) {
                        if (err) {
                            console.error("❌ Erro ao inserir horario:", err);
                            return;
                        }
                        inseridos++;
                        if (inseridos === horariosPadrao.length) {
                            res.json({
                                success: true,
                                message: 'Horários inicializados com sucesso!'
                            });
                        }
                    }
                );
            }
        }
    );
});

module.exports = router;