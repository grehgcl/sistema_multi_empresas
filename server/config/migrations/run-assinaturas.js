// server/config/migrations/run-assinaturas.js
// Migration: cria tabelas de assinatura recorrente + pagamentos mensais
// Rodar 1x: node server/config/migrations/run-assinaturas.js

const { db } = require('../database');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

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

async function runMigration() {
    console.log('🚀 ============================================');
    console.log('🚀 MIGRATION: assinaturas + pagamentos_mensalidade');
    console.log('🚀 ============================================\n');

    // ─────────────────────────────────────────────
    // 1. Tabela "assinaturas"
    // ─────────────────────────────────────────────
    console.log('📦 [1/4] Criando tabela "assinaturas"...');

    await run(`
        CREATE TABLE IF NOT EXISTS assinaturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL UNIQUE,
            plano_id TEXT NOT NULL,
            plano_nome TEXT NOT NULL,
            valor_mensal REAL NOT NULL DEFAULT 0,

            status TEXT NOT NULL DEFAULT 'trial',

            data_inicio TEXT NOT NULL,
            data_vencimento TEXT NOT NULL,
            ultimo_pagamento_em TEXT,

            meses_pagos INTEGER DEFAULT 0,
            meses_devendo INTEGER DEFAULT 0,
            total_pago REAL DEFAULT 0,

            metodo_pagamento TEXT,
            dia_vencimento INTEGER DEFAULT 5,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )
    `);

    console.log('   ✅ Tabela "assinaturas" criada\n');

    // ─────────────────────────────────────────────
    // 2. Tabela "pagamentos_mensalidade"
    // ─────────────────────────────────────────────
    console.log('📦 [2/4] Criando tabela "pagamentos_mensalidade"...');

    await run(`
        CREATE TABLE IF NOT EXISTS pagamentos_mensalidade (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            assinatura_id INTEGER NOT NULL,
            transacao_id INTEGER,

            mes_referencia TEXT NOT NULL,

            valor REAL NOT NULL DEFAULT 0,
            metodo TEXT,
            status TEXT NOT NULL DEFAULT 'pendente',

            data_vencimento TEXT NOT NULL,
            data_pagamento TEXT,

            cupom_uso_id INTEGER,
            comissao_gerada REAL DEFAULT 0,

            observacao TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (empresa_id) REFERENCES empresas(id),
            FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id)
        )
    `);

    console.log('   ✅ Tabela "pagamentos_mensalidade" criada\n');

    // ─────────────────────────────────────────────
    // 3. Índices
    // ─────────────────────────────────────────────
    console.log('📦 [3/4] Criando índices...');

    const indices = [
        `CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status)`,
        `CREATE INDEX IF NOT EXISTS idx_assinaturas_vencimento ON assinaturas(data_vencimento)`,
        `CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON pagamentos_mensalidade(empresa_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos_mensalidade(status)`,
        `CREATE INDEX IF NOT EXISTS idx_pagamentos_mes ON pagamentos_mensalidade(mes_referencia)`
    ];

    for (const idx of indices) {
        try {
            await run(idx);
        } catch (e) {
            console.warn('   ⚠️ Índice já existe ou erro:', e.message);
        }
    }

    console.log('   ✅ 5 índices criados/verificados\n');

    // ─────────────────────────────────────────────
    // 4. Backfill: cria assinatura pra empresas existentes
    // ─────────────────────────────────────────────
    console.log('📦 [4/4] Migrando empresas existentes...\n');

    const empresas = await all(`
        SELECT e.id, e.nome, e.plano, e.assinatura_ativa, 
               e.assinatura_valida_ate, e.trial_expira, e.created_at
        FROM empresas e
        WHERE e.id NOT IN (SELECT empresa_id FROM assinaturas)
        ORDER BY e.id
    `);

    console.log(`   📊 ${empresas.length} empresa(s) sem assinatura encontradas\n`);

    const valoresPorPlano = {
    trial: 0,
    starter: 29.90,
    pro: 59.90,
    business: 119.90,
    enterprise: 249.90
};

    let migradas = 0;
    let erros = 0;

    for (const emp of empresas) {
        try {
            const planoRaw = (emp.plano || 'trial').toLowerCase();
            const ehTrial = planoRaw === 'trial';
            const valor = valoresPorPlano[planoRaw] ?? 0;

            // Define data de vencimento:
            // 1º tenta assinatura_valida_ate
            // 2º tenta trial_expira
            // 3º calcula +7 dias
            const hoje = new Date();
            let vencimento;

            if (emp.assinatura_valida_ate) {
                vencimento = emp.assinatura_valida_ate;
            } else if (emp.trial_expira) {
                vencimento = emp.trial_expira;
            } else {
                const daqui7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
                vencimento = daqui7dias.toISOString().split('T')[0];
            }

            const status = ehTrial
                ? 'trial'
                : (emp.assinatura_ativa ? 'ativa' : 'vencida');

            await run(`
                INSERT INTO assinaturas
                    (empresa_id, plano_id, plano_nome, valor_mensal, status,
                     data_inicio, data_vencimento, dia_vencimento)
                VALUES (?, ?, ?, ?, ?, ?, ?, 5)
            `, [
                emp.id,
                planoRaw,
                emp.plano || 'Trial',
                valor,
                status,
                emp.created_at || hoje.toISOString().split('T')[0],
                vencimento
            ]);

            console.log(`   ✅ Empresa ${emp.id.toString().padEnd(3)} → ${status.padEnd(8)} → R$ ${valor.toFixed(2).padStart(6)} → vence ${vencimento}`);
            migradas++;

        } catch (err) {
            console.error(`   ❌ Empresa ${emp.id} (${emp.nome}): ${err.message}`);
            erros++;
        }
    }

    // ─────────────────────────────────────────────
    // 5. Resumo final
    // ─────────────────────────────────────────────
    console.log('\n🚀 ============================================');
    console.log('🚀 MIGRATION CONCLUÍDA');
    console.log('🚀 ============================================');
    console.log(`   ✅ Assinaturas criadas: ${migradas}`);
    if (erros > 0) console.log(`   ❌ Erros:               ${erros}`);
    console.log('   📦 Tabelas:             2 (assinaturas + pagamentos_mensalidade)');
    console.log('   📊 Índices:             5');
    console.log('   🎯 Total de empresas:   ' + (migradas + erros));
    console.log('🚀 ============================================\n');

    // Verificação final
    const totalAssinaturas = await get(`SELECT COUNT(*) as total FROM assinaturas`);
    const totalPagamentos = await get(`SELECT COUNT(*) as total FROM pagamentos_mensalidade`);

    console.log(`📊 Verificação final:`);
    console.log(`   • assinaturas:             ${totalAssinaturas.total}`);
    console.log(`   • pagamentos_mensalidade:  ${totalPagamentos.total}`);
    console.log('');

    process.exit(0);
}

runMigration().catch((err) => {
    console.error('\n❌ ERRO FATAL NA MIGRATION:');
    console.error(err);
    process.exit(1);
});