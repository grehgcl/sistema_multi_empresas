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

            // Se não veio nada, retorna erro
            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum campo para atualizar'
                });
            }

            // 🔥 MONTAR SQL DINÂMICO
            params.push(empresaId, diaNum);
            const sql = `UPDATE horarios_funcionamento SET ${updates.join(', ')} WHERE empresa_id = ? AND dia_semana = ?`;

            console.log(`📝 Atualizando dia ${diaNum}:`, updates);
            console.log(`📝 SQL: ${sql}`);
            console.log(`📝 Params:`, params);

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

        // Verificar se já existe
        empresaDb.get(
            `SELECT id FROM horarios_funcionamento WHERE dia_semana = ? AND empresa_id = ?`,
            [dia_semana, empresaId],
            (err, row) => {
                if (err) {
                    console.error("❌ Erro ao verificar horario:", err);
                    return;
                }

                if (row) {
                    // Atualizar
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
                    // Inserir
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

    // Se não houver horários
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

    // Limpar horários existentes
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