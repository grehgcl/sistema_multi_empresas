// server/jobs/lembretes-pagamento.js
const cron = require('node-cron');

// ============================================
// FUNÇÃO PARA FORMATAR DATA
// ============================================
function formatarData(dataStr) {
    if (!dataStr) return '-';
    try {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
            return partes[2] + '/' + partes[1] + '/' + partes[0];
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

// ============================================
// TEMPLATES DAS MENSAGENS
// ============================================
function templateLembrete2Dias(lembrete) {
    return `Olá *${lembrete.cliente_nome}*! ⏰

📝 Lembrete: Seu pagamento na *${lembrete.empresa_nome}* vence em *2 dias*!

💰 Valor: R$ ${(parseFloat(lembrete.valor) || 0).toFixed(2)}
📅 Vencimento: ${formatarData(lembrete.data_vencimento)}
✂️ Serviço: ${lembrete.servico || 'N/A'}

💳 Forma de pagamento: A Prazo (Fiado)

Por favor, não se esqueça de quitar seu pagamento.
Qualquer dúvida, entre em contato! 🙏`;
}

function templateLembrete1Dia(lembrete) {
    return `Olá *${lembrete.cliente_nome}*! ⏰

🚨 ATENÇÃO! Seu pagamento na *${lembrete.empresa_nome}* vence *AMANHÃ*!

💰 Valor: R$ ${(parseFloat(lembrete.valor) || 0).toFixed(2)}
📅 Vencimento: ${formatarData(lembrete.data_vencimento)}
✂️ Serviço: ${lembrete.servico || 'N/A'}

💳 Forma de pagamento: A Prazo (Fiado)

Não se esqueça de quitar seu pagamento amanhã! 🙏`;
}

function templateLembreteDia(lembrete) {
    return `Olá *${lembrete.cliente_nome}*! ⚠️

🚨 Seu pagamento na *${lembrete.empresa_nome}* VENCE HOJE!

💰 Valor: R$ ${(parseFloat(lembrete.valor) || 0).toFixed(2)}
📅 Vencimento: ${formatarData(lembrete.data_vencimento)}
✂️ Serviço: ${lembrete.servico || 'N/A'}

💳 Forma de pagamento: A Prazo (Fiado)

Por favor, efetue o pagamento hoje! 
Qualquer dúvida, entre em contato! 🙏`;
}

// ============================================
// FUNÇÃO PRINCIPAL - VERIFICAR E ENVIAR LEMBRETES
// ============================================
async function verificarLembretes(db, enviarWhatsApp) {
    try {
        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];

        console.log(`📅 Verificando lembretes para ${hojeStr}...`);

        // Buscar lembretes que precisam ser enviados
        const lembretes = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    lp.*,
                    a.servico,
                    a.valor,
                    a.cliente_id,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone,
                    e.nome as empresa_nome
                FROM lembretes_pagamento lp
                JOIN agendamentos a ON lp.agendamento_id = a.id
                JOIN clientes c ON lp.cliente_id = c.id
                JOIN empresas e ON lp.empresa_id = e.id
                WHERE lp.data_vencimento >= date('now', '-2 days')
                  AND lp.data_vencimento <= date('now')
                  AND (lp.lembrete_2dias = 0 OR lp.lembrete_1dia = 0 OR lp.lembrete_dia = 0)
                ORDER BY lp.data_vencimento ASC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📋 ${lembretes.length} lembretes pendentes encontrados`);

        let enviados = 0;

        for (const lembrete of lembretes) {
            // Calcular diferença de dias
            const hoje = new Date();
            const vencimento = new Date(lembrete.data_vencimento);
            const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

            let mensagem = '';
            let campo = '';

            console.log(`📝 #${lembrete.agendamento_id} - ${lembrete.cliente_nome} - Diferença: ${diffDias} dias`);

            if (diffDias === 2 && lembrete.lembrete_2dias === 0) {
                mensagem = templateLembrete2Dias(lembrete);
                campo = 'lembrete_2dias';
                console.log(`  📨 Enviando lembrete 2 dias antes`);
            } else if (diffDias === 1 && lembrete.lembrete_1dia === 0) {
                mensagem = templateLembrete1Dia(lembrete);
                campo = 'lembrete_1dia';
                console.log(`  📨 Enviando lembrete 1 dia antes`);
            } else if (diffDias === 0 && lembrete.lembrete_dia === 0) {
                mensagem = templateLembreteDia(lembrete);
                campo = 'lembrete_dia';
                console.log(`  📨 Enviando lembrete no dia do vencimento`);
            }

            if (mensagem && lembrete.cliente_telefone) {
                try {
                    // Enviar WhatsApp
                    await enviarWhatsApp(lembrete.cliente_telefone, mensagem);

                    // Marcar como enviado
                    await new Promise((resolve, reject) => {
                        db.run(`
                            UPDATE lembretes_pagamento 
                            SET ${campo} = 1,
                                updated_at = datetime('now')
                            WHERE id = ?
                        `, [lembrete.id], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                    enviados++;
                    console.log(`  ✅ Lembrete enviado para ${lembrete.cliente_nome}`);
                } catch (error) {
                    console.error(`  ❌ Erro ao enviar para ${lembrete.cliente_nome}:`, error.message);
                }
            } else if (!lembrete.cliente_telefone) {
                console.log(`  ⚠️ ${lembrete.cliente_nome} não tem telefone cadastrado`);
            }
        }

        console.log(`✅ ${enviados} lembretes enviados com sucesso!`);

    } catch (error) {
        console.error('❌ Erro no job de lembretes:', error);
    }
}

// ============================================
// INICIAR JOB AGENDADO
// ============================================
function iniciarJobLembretesPagamento(db, enviarWhatsApp) {
    // Executar a cada hora (para testes) ou todo dia às 08:00
    // Para testes: cron.schedule('0 * * * *', async () => {
    // Para produção: cron.schedule('0 8 * * *', async () => {
    cron.schedule('0 * * * *', async () => {
        console.log(`🔄 [${new Date().toISOString()}] Executando job de lembretes...`);
        await verificarLembretes(db, enviarWhatsApp);
    });

    console.log('✅ Job de lembretes de pagamento iniciado! (executa a cada hora)');

    // Executar imediatamente na primeira vez
    setTimeout(async () => {
        console.log('🔄 Executando verificação inicial de lembretes...');
        await verificarLembretes(db, enviarWhatsApp);
    }, 5000);
}

// ============================================
// FUNÇÃO PARA CRIAR LEMBRETE AO SALVAR FIADO
// ============================================
async function criarLembreteFiado(db, agendamentoId, empresaId, clienteId, dataVencimento) {
    try {
        // Buscar telefone do cliente
        const cliente = await new Promise((resolve, reject) => {
            db.get('SELECT telefone FROM clientes WHERE id = ?', [clienteId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO lembretes_pagamento 
                (agendamento_id, empresa_id, cliente_id, cliente_telefone, data_vencimento)
                VALUES (?, ?, ?, ?, ?)
            `, [agendamentoId, empresaId, clienteId, cliente?.telefone || null, dataVencimento], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✅ Lembrete criado para agendamento #${agendamentoId}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao criar lembrete:', error);
        return false;
    }
}

module.exports = {
    iniciarJobLembretesPagamento,
    criarLembreteFiado,
    verificarLembretes
};