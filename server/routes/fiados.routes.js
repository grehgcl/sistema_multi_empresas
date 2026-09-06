// ============================================
// ROTAS DE FIADOS - SEE&AGENDE
// ============================================

const express = require('express');
const router = express.Router();
const { getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');
const axios = require('axios');

// ============================================
// GET /api/fiados - LISTAR FIADOS
// ============================================

router.get('/', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { mes, ano } = req.query;

        console.log(`📊 Buscando fiados para empresa ${empresaId}`);

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        let sql = `
            SELECT 
                a.id,
                a.cliente_id,
                a.servico,
                a.valor,
                a.valor_total,
                a.data,
                a.hora,
                a.data_vencimento,
                a.prazo_dias,
                a.descricao_pagamento,
                c.nome as cliente_nome,
                c.telefone,
                c.email
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            WHERE a.empresa_id = ?
            AND a.forma_pagamento = 'prazo'
            AND a.status = 'concluido'
        `;

        let params = [empresaId];

        if (mes && ano) {
            sql += ` AND strftime('%m', a.data) = ? AND strftime('%Y', a.data) = ?`;
            params.push(mes.padStart(2, '0'), String(ano));
        }

        sql += ` ORDER BY a.id DESC`;

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        db.all(sql, params, (err, fiados) => {
            if (err) {
                console.error('❌ Erro ao buscar fiados:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            console.log(`📊 ${fiados.length} fiados encontrados`);

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const fiadosComStatus = fiados.map(f => {
                let status = 'pendente';
                let dias = 0;

                if (f.data_vencimento) {
                    const vencimento = new Date(f.data_vencimento);
                    vencimento.setHours(0, 0, 0, 0);
                    dias = Math.ceil((hoje - vencimento) / (1000 * 60 * 60 * 24));
                    
                    if (dias > 0) {
                        status = 'atrasado';
                    } else if (dias === 0) {
                        status = 'vence_hoje';
                    } else {
                        status = 'pendente';
                    }
                }

                return {
                    ...f,
                    dias_atraso: dias,
                    status: status,
                    valor_total: f.valor_total || f.valor || 0
                };
            });

            res.json({
                success: true,
                data: fiadosComStatus
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar fiados:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// PUT /api/fiados/:id/baixar - BAIXAR FIADO
// ============================================

router.put('/:id/baixar', auth, verificarDono, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;
        const { forma_pagamento, enviar_confirmacao } = req.body;

        console.log(`💰 Baixando fiado ${id} - Forma: ${forma_pagamento}`);

        const db = getEmpresaDb(empresaId);
        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        // Buscar o fiado
        const agendamento = await new Promise((resolve, reject) => {
            db.get(`
                SELECT a.*, c.nome as cliente_nome, c.telefone
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.id = ? AND a.empresa_id = ? AND a.forma_pagamento = 'prazo'
            `, [id, empresaId], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar agendamento:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Fiado não encontrado'
            });
        }

        console.log(`📋 Fiado encontrado: ${agendamento.cliente_nome} - ${agendamento.servico}`);

        // Atualizar
        await new Promise((resolve, reject) => {
            const sql = `
                UPDATE agendamentos 
                SET forma_pagamento = ?,
                    prazo_dias = 0,
                    data_vencimento = NULL,
                    descricao_pagamento = 'PAGO EM ' || datetime('now') || ' - ' || COALESCE(descricao_pagamento, '')
                WHERE id = ? AND empresa_id = ?
            `;
            db.run(sql, [forma_pagamento || 'dinheiro', id, empresaId], function(err) {
                if (err) {
                    console.error('❌ Erro ao atualizar:', err);
                    reject(err);
                } else {
                    console.log(`✅ Agendamento ${id} atualizado para PAGO`);
                    resolve();
                }
            });
        });

        // Enviar confirmação
        let mensagemEnviada = false;
        if (enviar_confirmacao !== false && agendamento.telefone) {
            try {
                const { db: mainDb } = require('../config/database');
                const empresa = await new Promise((resolve) => {
                    mainDb.get(
                        `SELECT nome, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
                        [empresaId],
                        (err, row) => {
                            if (err) {
                                console.error('❌ Erro ao buscar empresa:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });

                if (empresa && empresa.whatsapp_instance) {
                    const valorFormatado = (agendamento.valor_total || agendamento.valor || 0).toFixed(2).replace('.', ',');
                    const telefoneLimpo = agendamento.telefone.replace(/\D/g, '');
                    const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                    const mensagem = `✅ *Pagamento Confirmado!* 🎉\n\n` +
                        `Olá *${agendamento.cliente_nome || 'Cliente'}*!\n\n` +
                        `Seu pagamento foi registrado com sucesso!\n\n` +
                        `📋 *DETALHES:*\n` +
                        `✂️ Serviço: *${agendamento.servico || 'Serviço'}*\n` +
                        `💰 Valor: *R$ ${valorFormatado}*\n` +
                        `💳 Forma: *${forma_pagamento || 'dinheiro'}*\n\n` +
                        `Obrigado por confiar em nossos serviços! 🌟\n\n` +
                        `📞 *Contato:* ${empresa.telefone_dono || 'N/A'}\n\n` +
                        `---\n_Mensagem automática do See&Agende_`;

                    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080/';
                    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                    await axios.post(
                        `${EVOLUTION_API_URL}/message/sendText/${empresa.whatsapp_instance}`,
                        {
                            number: numeroFormatado,
                            text: mensagem,
                            delay: 1200
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': EVOLUTION_API_KEY
                            },
                            timeout: 30000
                        }
                    );
                    mensagemEnviada = true;
                    console.log(`✅ Mensagem de confirmação enviada para ${agendamento.cliente_nome}`);
                }
            } catch (error) {
                console.error('❌ Erro ao enviar mensagem:', error.message);
            }
        }

        res.json({
            success: true,
            message: 'Fiado baixado com sucesso!',
            data: {
                id: id,
                cliente: agendamento.cliente_nome,
                servico: agendamento.servico,
                valor: agendamento.valor_total || agendamento.valor || 0,
                forma_pagamento: forma_pagamento || 'dinheiro',
                mensagem_enviada: mensagemEnviada
            }
        });

    } catch (error) {
        console.error('❌ Erro ao baixar fiado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/fiados/stats - ESTATÍSTICAS
// ============================================

router.get('/stats', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN data_vencimento < date('now') THEN 1 ELSE 0 END) as atrasados,
                SUM(CASE WHEN data_vencimento >= date('now') THEN 1 ELSE 0 END) as a_vencer,
                COALESCE(SUM(valor_total), 0) as valor_total,
                COALESCE(SUM(CASE WHEN data_vencimento < date('now') THEN valor_total ELSE 0 END), 0) as valor_atrasado
            FROM agendamentos 
            WHERE empresa_id = ?
            AND forma_pagamento = 'prazo'
            AND status = 'concluido'
        `, [empresaId], (err, stats) => {
            if (err) {
                console.error('❌ Erro ao buscar estatísticas fiados:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                data: {
                    total: stats?.total || 0,
                    atrasados: stats?.atrasados || 0,
                    a_vencer: stats?.a_vencer || 0,
                    valor_total: stats?.valor_total || 0,
                    valor_atrasado: stats?.valor_atrasado || 0
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;