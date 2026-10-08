// ============================================
// JOB: VERIFICAR VENCIMENTOS
// Roda todo dia às 09:00
// 1. Marca como atrasado quem venceu
// 2. Suspende quem passou 5 dias de atraso
// 3. Envia WhatsApp (fase posterior)
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

// ============================================
// VERIFICAÇÃO DE VENCIMENTOS
// ============================================

async function verificarVencimentos() {
    const hoje = assinaturas.dataISO();
    const agora = new Date().toLocaleString('pt-BR');

    console.log(`\n⚠️  ================================`);
    console.log(`⚠️  VERIFICANDO VENCIMENTOS`);
    console.log(`⚠️  Data: ${hoje}`);
    console.log(`⚠️  Agora: ${agora}`);
    console.log(`⚠️  ================================\n`);

    try {
        // 1. Marcar como ATRASADO quem venceu e ainda tá 'pendente'
        const pendentes = await all(`
            SELECT p.id, p.empresa_id, p.mes_referencia, p.valor, p.data_vencimento, e.nome
            FROM pagamentos_mensalidade p
            INNER JOIN empresas e ON e.id = p.empresa_id
            WHERE p.status = 'pendente'
              AND p.data_vencimento < ?
        `, [hoje]);

        console.log(`📊 ${pendentes.length} pagamento(s) vencido(s) ainda como 'pendente'\n`);

        for (const p of pendentes) {
            await assinaturas.marcarAtrasado(p.id);
            console.log(`   🔴 Empresa ${p.empresa_id} (${p.nome}) — ${p.mes_referencia} → ATRASADO`);
        }

        // 2. Suspender quem passou 5 dias de atraso
        const suspender = await all(`
            SELECT p.id, p.empresa_id, p.data_vencimento, e.nome,
                   CAST((julianday(?) - julianday(p.data_vencimento)) AS INTEGER) AS dias_atraso
            FROM pagamentos_mensalidade p
            INNER JOIN empresas e ON e.id = p.empresa_id
            INNER JOIN assinaturas a ON a.empresa_id = p.empresa_id
            WHERE p.status = 'atrasado'
              AND a.status NOT IN ('suspensa', 'cancelada')
              AND CAST((julianday(?) - julianday(p.data_vencimento)) AS INTEGER) >= 5
        `, [hoje, hoje]);

        console.log(`\n📊 ${suspender.length} empresa(s) com +5 dias de atraso\n`);

        for (const s of suspender) {
            await assinaturas.suspenderEmpresa(s.empresa_id, `atraso ${s.dias_atraso} dias`);
            console.log(`   ⛔ Empresa ${s.empresa_id} (${s.nome}) — ${s.dias_atraso} dias de atraso → SUSPENSA`);
        }

        // 3. Estatísticas
        const stats = await all(`
            SELECT status, COUNT(*) as total
            FROM pagamentos_mensalidade
            WHERE mes_referencia = ?
            GROUP BY status
        `, [assinaturas.mesReferencia()]);

        console.log(`\n📊 Estatísticas do mês ${assinaturas.mesReferencia()}:`);
        stats.forEach(s => {
            console.log(`   • ${s.status}: ${s.total}`);
        });

        console.log(`\n⚠️  ================================`);
        console.log(`⚠️  CONCLUÍDO`);
        console.log(`⚠️    🔴 Atrasados:   ${pendentes.length}`);
        console.log(`⚠️    ⛔ Suspensos:   ${suspender.length}`);
        console.log(`⚠️  ================================\n`);

        return {
            atrasados: pendentes.length,
            suspensos: suspender.length
        };

    } catch (err) {
        console.error('❌ Erro no job de verificação:', err);
        return { atrasados: 0, suspensos: 0, erro: true };
    }
}

// ============================================
// AGENDAR
// ============================================

function start() {
    console.log('⚠️  Job de verificação de vencimentos agendado (diário às 09:00)');

    cron.schedule('0 9 * * *', async () => {
        console.log('\n⏰ [CRON] Disparando verificação de vencimentos...');
        await verificarVencimentos();
    }, {
        timezone: 'America/Sao_Paulo'
    });
}

module.exports = { start, verificarVencimentos };