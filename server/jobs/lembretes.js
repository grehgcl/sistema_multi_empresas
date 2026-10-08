// server/jobs/lembretes.js
const cron = require('node-cron');
const { db, getEmpresaDb } = require('../config/database');
const whatsappService = require('../services/whatsapp');

// 🔥 Configuração: enviar quantas horas antes do agendamento?
const HORAS_ANTES = 4;

// 🔥 Janela de tolerância (em horas)
// Ex: 4h antes com 0.5h de margem = envia entre 3h30 e 4h30 antes
const MARGEM_HORAS = 0.5;

class LembreteJob {
    constructor() {
        this.executando = false;
    }

    // ============================================
    // LISTA TODAS AS EMPRESAS
    // ============================================
    async listarEmpresas() {
        return new Promise((resolve, reject) => {
            db.all(`SELECT id, nome FROM empresas`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // ============================================
    // BUSCA AGENDAMENTOS DE UMA EMPRESA
    // Janela: "agora + (4h - margem)" até "agora + (4h + margem)"
    // ============================================
async buscarAgendamentosEmpresa(empresaId) {
    const empresaDb = getEmpresaDb(empresaId);
    if (!empresaDb) return [];

    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];

    const janelaInicio = new Date(agora.getTime() + (HORAS_ANTES - MARGEM_HORAS) * 60 * 60 * 1000);
    const janelaFim    = new Date(agora.getTime() + (HORAS_ANTES + MARGEM_HORAS) * 60 * 60 * 1000);

    const dataInicio = janelaInicio.toISOString().split('T')[0];
    const horaInicio = janelaInicio.toTimeString().slice(0, 5);
    const dataFim    = janelaFim.toISOString().split('T')[0];
    const horaFim    = janelaFim.toTimeString().slice(0, 5);

    const mesmoDia = (dataInicio === dataFim);

    console.log(`[LEMBRETE] Janela: ${dataInicio} ${horaInicio} → ${dataFim} ${horaFim}${mesmoDia ? ' (mesmo dia)' : ' (virada)'}`);

    // 🔥 Monta a query conforme o caso
    let sql;
    let params;

    if (mesmoDia) {
        // Janela no mesmo dia: hora BETWEEN horaInicio AND horaFim
        sql = `
            SELECT 
                a.*,
                c.nome as cliente_nome,
                c.telefone as cliente_telefone,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.status = 'pendente'
              AND (a.lembrete_enviado = 0 OR a.lembrete_enviado IS NULL)
              AND a.data = ?
              AND a.hora >= ?
              AND a.hora <= ?
        `;
        params = [dataInicio, horaInicio, horaFim];
    } else {
        // Virada de dia: 2 condições
        sql = `
            SELECT 
                a.*,
                c.nome as cliente_nome,
                c.telefone as cliente_telefone,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.status = 'pendente'
              AND (a.lembrete_enviado = 0 OR a.lembrete_enviado IS NULL)
              AND (
                    (a.data = ? AND a.hora >= ?)
                 OR (a.data = ? AND a.hora <= ?)
              )
        `;
        params = [dataInicio, horaInicio, dataFim, horaFim];
    }

    return new Promise((resolve) => {
        empresaDb.all(sql, params, (err, rows) => {
            if (err) {
                console.error(`[LEMBRETE] Erro query empresa ${empresaId}:`, err.message);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
}
    // ============================================
    // BUSCA AGENDAMENTOS "URGENTES"
    // (criados faltando < 4h — envia assim que puder)
    // ============================================
async buscarAgendamentosUrgentes(empresaId) {
    const empresaDb = getEmpresaDb(empresaId);
    if (!empresaDb) return [];

    const agora = new Date();
    const janelaUrgenteFim = new Date(agora.getTime() + (HORAS_ANTES - MARGEM_HORAS) * 60 * 60 * 1000);

    const dataAgora = agora.toISOString().split('T')[0];
    const horaAgora = agora.toTimeString().slice(0, 5);

    const dataFim = janelaUrgenteFim.toISOString().split('T')[0];
    const horaFim = janelaUrgenteFim.toTimeString().slice(0, 5);

    const mesmoDia = (dataAgora === dataFim);

    let sql, params;

    if (mesmoDia) {
        // Janela no mesmo dia
        sql = `
            SELECT 
                a.*,
                c.nome as cliente_nome,
                c.telefone as cliente_telefone,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.data = ?
              AND a.hora > ?
              AND a.hora < ?
              AND a.status = 'pendente'
              AND (a.lembrete_enviado = 0 OR a.lembrete_enviado IS NULL)
        `;
        params = [dataAgora, horaAgora, horaFim];
    } else {
        // Virada de dia: hoje depois de agora + amanhã antes do limite
        sql = `
            SELECT 
                a.*,
                c.nome as cliente_nome,
                c.telefone as cliente_telefone,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE (
                    (a.data = ? AND a.hora > ?)
                 OR (a.data = ? AND a.hora < ?)
                  )
              AND a.status = 'pendente'
              AND (a.lembrete_enviado = 0 OR a.lembrete_enviado IS NULL)
        `;
        params = [dataAgora, horaAgora, dataFim, horaFim];
    }

    return new Promise((resolve) => {
        empresaDb.all(sql, params, (err, rows) => {
            if (err) {
                console.error(`[LEMBRETE] Erro query urgente empresa ${empresaId}:`, err.message);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
}
    // ============================================
    // MARCA COMO ENVIADO
    // ============================================
    async marcarComoEnviado(empresaDb, agendamentoId) {
        return new Promise((resolve) => {
            empresaDb.run(
                `UPDATE agendamentos SET lembrete_enviado = 1 WHERE id = ?`,
                [agendamentoId],
                (err) => {
                    if (err) {
                        console.error(`[LEMBRETE] Erro ao marcar (ID ${agendamentoId}):`, err.message);
                    }
                    resolve();
                }
            );
        });
    }

    // ============================================
    // PROCESSA UM AGENDAMENTO (envia + marca)
    // ============================================
    async processarAgendamento(agendamento, empresaDb, dadosEmpresa, tipoLembrete = 'normal') {
        try {
            if (!agendamento.cliente_telefone || agendamento.cliente_telefone.length < 10) {
                console.log(`[LEMBRETE] ⚠️ Cliente sem telefone (ID ${agendamento.id})`);
                return false;
            }

            console.log(`[LEMBRETE] → [${tipoLembrete}] ${agendamento.cliente_nome} · ${agendamento.data} ${agendamento.hora}`);

            const dados = {
                cliente: {
                    nome: agendamento.cliente_nome || 'Cliente',
                    telefone: agendamento.cliente_telefone
                },
                servico: {
                    nome: agendamento.servico_nome || 'Serviço'
                },
                profissional: agendamento.profissional_nome
                    ? { nome: agendamento.profissional_nome }
                    : null,
                data: agendamento.data,
                hora: agendamento.hora,
                empresa: {
                    id: dadosEmpresa.id,
                    nome: dadosEmpresa.nome || 'Barbearia',
                    endereco: dadosEmpresa.endereco || '',
                    telefone_dono: dadosEmpresa.telefone_dono || '',
                    instagram: dadosEmpresa.instagram || '',
                    whatsapp_instance: dadosEmpresa.whatsapp_instance
                }
            };

            const resultado = await whatsappService.enviarLembrete(dados);

            if (resultado && resultado.success) {
                console.log(`[LEMBRETE] ✅ Enviado (ID ${agendamento.id})`);
                await this.marcarComoEnviado(empresaDb, agendamento.id);
                return true;
            } else {
                console.log(`[LEMBRETE] ⚠️ Falha (ID ${agendamento.id}): ${resultado?.error || 'erro'}`);
                return false;
            }
        } catch (error) {
            console.error(`[LEMBRETE] ❌ Erro (ID ${agendamento.id}):`, error.message);
            return false;
        }
    }

    // ============================================
    // ENVIA LEMBRETES (normal 4h + urgentes)
    // ============================================
    async enviarLembretes() {
        if (this.executando) {
            console.log('[LEMBRETE] Job já está executando');
            return;
        }

        this.executando = true;
        console.log('[LEMBRETE] ================================');
        console.log(`[LEMBRETE] Iniciando envio (${HORAS_ANTES}h antes)...`);
        console.log(`[LEMBRETE] Agora: ${new Date().toLocaleString('pt-BR')}`);

        try {
            const empresas = await this.listarEmpresas();
            console.log(`[LEMBRETE] Empresas encontradas: ${empresas.length}`);

            let totalEnviados = 0;
            let totalErros = 0;

            // 🔥 Cache evita processar a mesma empresa 2x
            const empresasProcessadas = new Set();

            for (const empresa of empresas) {
                const empresaId = empresa.id;

                if (empresasProcessadas.has(empresaId)) continue;
                empresasProcessadas.add(empresaId);

                const empresaDb = getEmpresaDb(empresaId);
                if (!empresaDb) {
                    console.log(`[LEMBRETE] ⚠️ Banco da empresa ${empresaId} não encontrado`);
                    continue;
                }

                // Busca dados completos da empresa
                const dadosEmpresa = await new Promise((resolve) => {
                    db.get(
                        `SELECT id, nome, endereco, telefone_dono, whatsapp_instance, instagram 
                         FROM empresas WHERE id = ?`,
                        [empresaId],
                        (err, row) => resolve(err ? null : row)
                    );
                });

                if (!dadosEmpresa || !dadosEmpresa.whatsapp_instance) {
                    console.log(`[LEMBRETE] ⚠️ Empresa ${empresaId} sem WhatsApp`);
                    continue;
                }

                // 🔥 ETAPA 1: janela normal (4h antes)
                const agendamentos = await this.buscarAgendamentosEmpresa(empresaId);

                // 🔥 ETAPA 2: urgentes (< 4h)
                const agendamentosUrgentes = await this.buscarAgendamentosUrgentes(empresaId);

                // Junta os dois (evitando duplicar por ID)
                const idsVistos = new Set();
                const listaFinal = [];

                for (const ag of agendamentos) {
                    if (!idsVistos.has(ag.id)) {
                        idsVistos.add(ag.id);
                        listaFinal.push({ ag, tipo: 'normal' });
                    }
                }
                for (const ag of agendamentosUrgentes) {
                    if (!idsVistos.has(ag.id)) {
                        idsVistos.add(ag.id);
                        listaFinal.push({ ag, tipo: 'urgente' });
                    }
                }

                if (listaFinal.length === 0) continue;

                console.log(`[LEMBRETE] Empresa ${empresaId} (${dadosEmpresa.nome}): ${listaFinal.length} agendamentos`);

                for (const { ag, tipo } of listaFinal) {
                    const ok = await this.processarAgendamento(ag, empresaDb, dadosEmpresa, tipo);
                    if (ok) totalEnviados++;
                    else totalErros++;

                    // Pausa entre envios
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`[LEMBRETE] ✅ Concluído: ${totalEnviados} enviados, ${totalErros} erros`);
            console.log('[LEMBRETE] ================================');

        } catch (error) {
            console.error('[LEMBRETE] ❌ Erro geral:', error.message);
        } finally {
            this.executando = false;
        }
    }

    // ============================================
    // INICIA O JOB
    // ============================================
    start() {
        // Roda a cada 30 minutos
        cron.schedule('*/30 * * * *', async () => {
            console.log('[LEMBRETE] ⏰ Job agendado iniciado');
            await this.enviarLembretes();
        });

        console.log(`[LEMBRETE] 📅 Job iniciado (${HORAS_ANTES}h antes, cron 30min)`);

        // Roda 1x ao iniciar o servidor (após 30s)
        setTimeout(() => {
            console.log('[LEMBRETE] 🔄 Rodando primeira execução...');
            this.enviarLembretes();
        }, 30000);
    }
}

const lembreteJob = new LembreteJob();
module.exports = lembreteJob;