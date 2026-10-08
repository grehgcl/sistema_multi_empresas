// ============================================
// JOB: GERAR COBRANÇA MENSAL
// Roda todo dia 1 às 08:00
// ============================================

const cron = require('node-cron');
const { db } = require('../config/database');
const assinaturas = require('../services/assinaturas');

// ============================================
// HELPERS
// ============================================

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// ============================================
// LÓGICA PRINCIPAL
// ============================================

async function gerarCobrancasDoMes() {
    const mes = assinaturas.mesReferencia();
    const agora = new Date().toLocaleString('pt-BR');

    console.log(`\n💰 ================================`);
    console.log(`💰 GERANDO COBRANÇAS MENSAIS`);
    console.log(`💰 Mês: ${mes}`);
    console.log(`💰 Agora: ${agora}`);
    console.log(`💰 ================================\n`);

    try {
        // 1. Buscar todas as empresas com assinatura ativa ou trial-expirado
        // (trial dentro do prazo NÃO gera cobrança ainda — vira na próxima rodada)
        const empresas = await all(`
            SELECT e.id, e.nome, a.status, a.data_vencimento, a.valor_mensal
            FROM empresas e
            INNER JOIN assinaturas a ON a.empresa_id = e.id
            WHERE a.status IN ('ativa', 'trial')
              AND e.id NOT IN (
                  SELECT empresa_id FROM pagamentos_mensalidade
                  WHERE mes_referencia = ?
              )
        `, [mes]);

        console.log(`📊 ${empresas.length} empresa(s) precisam de cobrança este mês\n`);

        let geradas = 0;
        let ignoradas = 0;
        let erros = 0;

        for (const emp of empresas) {
            try {
                // Se for trial e ainda tá dentro do prazo, pula
                if (emp.status === 'trial') {
                    const hoje = assinaturas.dataISO();
                    if (emp.data_vencimento >= hoje) {
                        console.log(`⏭️  Empresa ${emp.id} (${emp.nome}) — trial até ${emp.data_vencimento}, ainda dentro do prazo`);
                        ignoradas++;
                        continue;
                    }
                    // Trial expirado: gera cobrança e muda status pra 'vencida'
                    console.log(`⏰ Empresa ${emp.id} (${emp.nome}) — trial expirou em ${emp.data_vencimento}, gerando cobrança`);
                    await assinaturas.run(`
                        UPDATE assinaturas
                        SET status = 'vencida'
                        WHERE empresa_id = ?
                    `, [emp.id]);
                }

                // Gera a cobrança
                const resultado = await assinaturas.gerarCobrancaMensal(emp.id, mes);

                if (resultado && resultado.success) {
                    geradas++;
                } else if (resultado && resultado.motivo === 'ja-existe') {
                    ignoradas++;
                } else {
                    ignoradas++;
                }
            } catch (err) {
                console.error(`❌ Empresa ${emp.id} (${emp.nome}): ${err.message}`);
                erros++;
            }
        }

        console.log(`\n💰 ================================`);
        console.log(`💰 CONCLUÍDO`);
        console.log(`💰   ✅ Geradas:   ${geradas}`);
        console.log(`💰   ⏭️  Ignoradas: ${ignoradas}`);
        if (erros > 0) {
            console.log(`💰   ❌ Erros:     ${erros}`);
        }
        console.log(`💰 ================================\n`);

        return { geradas, ignoradas, erros };

    } catch (err) {
        console.error('❌ Erro fatal no job de cobrança:', err);
        return { geradas: 0, ignoradas: 0, erros: 1 };
    }
}

// ============================================
// AGENDAR
// ============================================

/**
 * Agenda: todo dia 1 às 08:00
 * Cron: "0 8 1 * *" = minuto 0, hora 8, dia 1, todo mês, todo dia da semana
 */
function start() {
    console.log('💰 Job de cobrança mensal agendado (dia 1 às 08:00)');

    cron.schedule('0 8 1 * *', async () => {
        console.log('\n⏰ [CRON] Disparando job de cobrança mensal...');
        await gerarCobrancasDoMes();
    }, {
        timezone: 'America/Sao_Paulo'
    });

    // Verifica se hoje é dia 1 e se já passou das 08:00 → roda imediatamente
    const hoje = new Date();
    if (hoje.getDate() === 1 && hoje.getHours() >= 8) {
        console.log('💰 [STARTUP] Hoje é dia 1 e já passou das 08:00 — rodando agora...');
        setTimeout(() => {
            gerarCobrancasDoMes().catch(err => console.error('❌ Erro:', err));
        }, 5000); // 5s de delay pra não atrapalhar o boot
    }
}

module.exports = { start, gerarCobrancasDoMes };