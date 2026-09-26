// Roda a criação da tabela bloqueios_agenda em TODAS as empresas
// Versão SEQUENCIAL — processa uma empresa por vez
const { db, getEmpresaDb } = require('../database');

console.log('🚀 Iniciando migration de bloqueios_agenda...\n');

const SQL_CREATE = `
CREATE TABLE IF NOT EXISTS bloqueios_agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    profissional_id INTEGER,
    tipo TEXT NOT NULL DEFAULT 'periodo',
    data_inicio TEXT NOT NULL,
    data_fim TEXT,
    datas_especificas TEXT DEFAULT '[]',
    dia_inteiro INTEGER DEFAULT 1,
    hora_inicio TEXT,
    hora_fim TEXT,
    motivo TEXT,
    criado_por INTEGER,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

db.all('SELECT id, nome FROM empresas', [], async (err, empresas) => {
    if (err) {
        console.error('❌ Erro ao buscar empresas:', err.message);
        process.exit(1);
    }

    if (!empresas || empresas.length === 0) {
        console.log('⚠️ Nenhuma empresa encontrada.');
        process.exit(0);
    }

    console.log(`📋 ${empresas.length} empresa(s) encontrada(s)\n`);

    let ok = 0, erro = 0, semBanco = 0;

    for (const empresa of empresas) {
        console.log(`🔹 [${empresa.id}] ${empresa.nome}...`);

        const empresaDb = getEmpresaDb(empresa.id);
        if (!empresaDb) {
            console.log(`   ⚠️ banco não encontrado — PULANDO\n`);
            semBanco++;
            continue;
        }

        try {
            await new Promise((resolve) => {
                empresaDb.run(SQL_CREATE, (e) => {
                    if (e) {
                        console.error(`   ❌ erro: ${e.message}\n`);
                        erro++;
                        resolve();
                        return;
                    }

                    // Cria índices (ignora erro se já existir)
                    empresaDb.run(`CREATE INDEX IF NOT EXISTS idx_bloqueios_empresa ON bloqueios_agenda(empresa_id, data_inicio, data_fim, ativo)`, () => {});
                    empresaDb.run(`CREATE INDEX IF NOT EXISTS idx_bloqueios_profissional ON bloqueios_agenda(empresa_id, profissional_id, ativo)`, () => {});

                    console.log(`   ✅ tabela criada\n`);
                    ok++;
                    resolve();
                });
            });
        } catch (e) {
            console.error(`   ❌ exceção: ${e.message}\n`);
            erro++;
        }
    }

    console.log('═══════════════════════════════════════');
    console.log('📊 RESUMO');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Sucesso:   ${ok}`);
    console.log(`⚠️  Sem banco: ${semBanco}`);
    console.log(`❌ Erros:     ${erro}`);
    console.log('\n✅ Migration concluída!');

    // Força saída limpa depois de 500ms (garante que todos os callbacks terminem)
    setTimeout(() => process.exit(0), 500);
});