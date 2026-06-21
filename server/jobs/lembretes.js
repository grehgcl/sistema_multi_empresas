// server/jobs/lembretes.js
const cron = require('node-cron');
const { db } = require('../config/database');
const whatsappService = require('../services/whatsapp');

class LembreteJob {
    constructor() {
        this.executando = false;
    }

    // ============================================
    // ENVIA LEMBRETES 24H ANTES
    // ============================================
    async enviarLembretes() {
        if (this.executando) {
            console.log('[LEMBRETE] Job já está executando');
            return;
        }

        this.executando = true;
        console.log('[LEMBRETE] Iniciando envio de lembretes...');

        try {
            const hoje = new Date();
            const amanha = new Date(hoje);
            amanha.setDate(amanha.getDate() + 1);

            const dataAmanha = amanha.toISOString().split('T')[0];

            console.log(`[LEMBRETE] Buscando agendamentos para: ${dataAmanha}`);

            // ============================================
            // CORREÇÃO: Removido e.endereco (não existe)
            // ============================================
            const agendamentos = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        a.*,
                        c.nome as cliente_nome,
                        c.telefone as cliente_telefone,
                        s.nome as servico_nome,
                        p.nome as profissional_nome,
                        p.telefone as profissional_telefone,
                        e.nome as empresa_nome
                    FROM agendamentos a
                    LEFT JOIN clientes c ON a.cliente_id = c.id
                    LEFT JOIN servicos s ON a.servico_id = s.id
                    LEFT JOIN profissionais p ON a.profissional_id = p.id
                    LEFT JOIN empresas e ON a.empresa_id = e.id
                    WHERE a.data = ?
                    AND a.status = 'pendente'
                    AND a.lembrete_enviado = 0
                `, [dataAmanha], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            console.log(`[LEMBRETE] Encontrados ${agendamentos.length} agendamentos para amanhã (${dataAmanha})`);

            if (agendamentos.length === 0) {
                console.log('[LEMBRETE] Nenhum agendamento pendente para amanhã');
                this.executando = false;
                return;
            }

            for (const agendamento of agendamentos) {
                try {
                    console.log(`[LEMBRETE] Processando agendamento ID ${agendamento.id}...`);

                    // Envia lembrete para o cliente
                    if (agendamento.cliente_telefone) {
                        const dados = {
                            cliente: {
                                nome: agendamento.cliente_nome || 'Cliente',
                                telefone: agendamento.cliente_telefone
                            },
                            servico: { nome: agendamento.servico_nome || 'Serviço' },
                            profissional: agendamento.profissional_nome ? {
                                nome: agendamento.profissional_nome
                            } : null,
                            data: agendamento.data,
                            hora: agendamento.hora,
                            empresa: {
                                nome: agendamento.empresa_nome || 'Barbearia'
                            }
                        };

                        console.log(`[LEMBRETE] Enviando para ${agendamento.cliente_nome} (${agendamento.cliente_telefone})`);

                        const resultado = await whatsappService.enviarLembrete(dados);

                        if (resultado.success) {
                            console.log(`[LEMBRETE] ✅ Mensagem enviada com sucesso`);

                            // Marca como enviado
                            await new Promise((resolve, reject) => {
                                db.run(
                                    `UPDATE agendamentos SET lembrete_enviado = 1 WHERE id = ?`,
                                    [agendamento.id],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
                        } else {
                            console.log(`[LEMBRETE] ⚠️ Falha ao enviar: ${resultado.error}`);
                        }
                    } else {
                        console.log(`[LEMBRETE] ⚠️ Cliente sem telefone, pulando...`);
                    }

                    // Pequena pausa para não sobrecarregar a API
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error(`[LEMBRETE] ❌ Erro ao enviar para ID ${agendamento.id}:`, error.message);
                }
            }

            console.log('[LEMBRETE] ✅ Envio de lembretes concluído');

        } catch (error) {
            console.error('[LEMBRETE] ❌ Erro no job:', error.message);
            console.error('[LEMBRETE] Detalhes:', error);
        } finally {
            this.executando = false;
        }
    }

    // ============================================
    // INICIA O JOB AGENDADO
    // ============================================
    start() {
        // Executa todos os dias às 09:00
        cron.schedule('0 9 * * *', async () => {
            console.log('[LEMBRETE] ⏰ Job agendado iniciado');
            await this.enviarLembretes();
        });

        console.log('[LEMBRETE] 📅 Job de lembretes iniciado (09:00 todos os dias)');
    }
}

const lembreteJob = new LembreteJob();
module.exports = lembreteJob;