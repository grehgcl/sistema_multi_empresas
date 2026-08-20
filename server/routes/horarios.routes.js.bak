const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = false; // 🔥 FORÇADO SQLITE

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
// PUT /api/horarios/:dia - Atualizar horário
// ============================================
router.put('/:dia', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const empresaDb = getEmpresaDb(empresaId);
    const { dia } = req.params;
    const { aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim } = req.body;

    const diaNum = parseInt(dia);
    if (isNaN(diaNum) || diaNum < 0 || diaNum > 6) {
        return res.status(400).json({
            success: false,
            message: 'Dia inválido'
        });
    }

    // 🔥 VERIFICAR SE O DIA EXISTE
    empresaDb.get('SELECT id FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?',
        [empresaId, diaNum], (err, row) => {
            if (err) {
                console.error("❌ Erro ao verificar horario:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            // 🔥 SE NÃO EXISTIR, CRIAR
            if (!row) {
                console.log(`🆕 Criando horário para dia ${diaNum}`);
                empresaDb.run(`
                INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [empresaId, diaNum, aberto ? 1 : 0, hora_inicio || '08:00', hora_fim || '18:00', almoco_inicio || '12:00', almoco_fim || '13:00'],
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

            // 🔥 ATUALIZAR EXISTENTE
            const sql = `
            UPDATE horarios_funcionamento 
            SET aberto = ?, hora_inicio = ?, hora_fim = ?, almoco_inicio = ?, almoco_fim = ?
            WHERE empresa_id = ? AND dia_semana = ?
        `;

            empresaDb.run(sql, [
                aberto ? 1 : 0,
                hora_inicio || '08:00',
                hora_fim || '18:00',
                almoco_inicio || '12:00',
                almoco_fim || '13:00',
                empresaId,
                diaNum
            ], function (err) {
                if (err) {
                    console.error("❌ Erro ao atualizar horario:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

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
router.post('/', auth, verificarDono, async (req, res) => {
    const { horarios } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!horarios || !Array.isArray(horarios)) {
        return res.status(400).json({
            success: false,
            message: 'Lista de horarios invalida'
        });
    }

    try {
        for (const horario of horarios) {
            const { dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = horario;

            const checkSql = isProduction
                ? "SELECT id FROM horarios_funcionamento WHERE dia_semana = $1 AND empresa_id = $2"
                : "SELECT id FROM horarios_funcionamento WHERE dia_semana = ? AND empresa_id = ?";

            const existing = await new Promise((resolve) => {
                db.get(checkSql, [dia_semana, empresaId], (err, row) => {
                    resolve(row);
                });
            });

            if (existing) {
                const sql = isProduction
                    ? "UPDATE horarios_funcionamento SET aberto = $1, hora_inicio = $2, hora_fim = $3, almoco_inicio = $4, almoco_fim = $5, intervalo_minutos = $6 WHERE dia_semana = $7 AND empresa_id = $8"
                    : "UPDATE horarios_funcionamento SET aberto = ?, hora_inicio = ?, hora_fim = ?, almoco_inicio = ?, almoco_fim = ?, intervalo_minutos = ? WHERE dia_semana = ? AND empresa_id = ?";

                await new Promise((resolve, reject) => {
                    db.run(sql, [
                        aberto !== undefined ? aberto : 1,
                        hora_inicio || '09:00',
                        hora_fim || '18:00',
                        almoco_inicio || '12:00',
                        almoco_fim || '13:00',
                        intervalo_minutos || 30,
                        dia_semana,
                        empresaId
                    ], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } else {
                const sql = isProduction
                    ? "INSERT INTO horarios_funcionamento (dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos, empresa_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
                    : "INSERT INTO horarios_funcionamento (dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

                await new Promise((resolve, reject) => {
                    db.run(sql, [
                        dia_semana,
                        aberto !== undefined ? aberto : 1,
                        hora_inicio || '09:00',
                        hora_fim || '18:00',
                        almoco_inicio || '12:00',
                        almoco_fim || '13:00',
                        intervalo_minutos || 30,
                        empresaId
                    ], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }

        res.json({
            success: true,
            message: 'Horarios salvos com sucesso!'
        });

    } catch (error) {
        console.error("Erro ao salvar horarios:", error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao salvar horarios'
        });
    }
});

module.exports = router;