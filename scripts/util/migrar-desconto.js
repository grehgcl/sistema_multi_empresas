// scripts/migrar-desconto.js
// Roda ALTER TABLE nas colunas de desconto em TODOS os bancos ATIVOS
// (ignora a pasta backups/)

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const ROOT = path.resolve(__dirname, '..');

// 🚫 Pastas que NÃO devem ser alteradas
const IGNORAR = ['node_modules', 'backups', '.git', 'back', 'old', 'tmp'];

function encontrarBancos(dir, resultados = []) {
    let itens;
    try {
        itens = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return resultados;
    }

    for (const item of itens) {
        // Ignora pastas proibidas
        if (IGNORAR.includes(item.name) || item.name.startsWith('.')) continue;

        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            encontrarBancos(fullPath, resultados);
        } else if (item.name.endsWith('.db')) {
            resultados.push(fullPath);
        }
    }
    return resultados;
}

async function migrarUmBanco(dbPath) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath);

        // Verifica se a tabela agendamentos existe
        db.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'`,
            (err, row) => {
                if (err || !row) {
                    console.log(`   ⏭️  Sem tabela agendamentos — pulando`);
                    db.close();
                    return resolve({ ok: false, motivo: 'sem tabela' });
                }

                const comandos = [
                    `ALTER TABLE agendamentos ADD COLUMN desconto_tipo TEXT DEFAULT NULL`,
                    `ALTER TABLE agendamentos ADD COLUMN desconto_valor REAL DEFAULT 0`,
                    `ALTER TABLE agendamentos ADD COLUMN valor_bruto REAL DEFAULT 0`
                ];

                let i = 0;
                let adicionadas = 0;
                let jaExistiam = 0;

                function proximo() {
                    if (i >= comandos.length) {
                        db.close();
                        return resolve({ ok: true, adicionadas, jaExistiam });
                    }
                    db.run(comandos[i++], (err) => {
                        if (err) {
                            if (err.message.includes('duplicate column')) {
                                jaExistiam++;
                            } else {
                                console.log(`   ⚠️  ${err.message}`);
                            }
                        } else {
                            adicionadas++;
                        }
                        proximo();
                    });
                }
                proximo();
            }
        );
    });
}

(async () => {
    console.log('🔍 Procurando bancos (ignorando backups/ e node_modules/)...\n');

    const bancos = encontrarBancos(ROOT);

    if (bancos.length === 0) {
        console.log('❌ Nenhum banco .db encontrado fora das pastas ignoradas.');
        console.log('   Verifique se os bancos estão em outra pasta.\n');
        return;
    }

    console.log(`📁 Encontrados ${bancos.length} banco(s):\n`);

    for (const db of bancos) {
        const relativo = path.relative(ROOT, db);
        console.log(`🔧 ${relativo}`);
        const resultado = await migrarUmBanco(db);
        if (resultado.ok) {
            if (resultado.adicionadas > 0) {
                console.log(`   ✅ ${resultado.adicionadas} coluna(s) adicionada(s)`);
            }
            if (resultado.jaExistiam > 0) {
                console.log(`   ⏭️  ${resultado.jaExistiam} coluna(s) já existia(m)`);
            }
        }
        console.log('');
    }

    console.log('✅ Migração concluída!');
})();