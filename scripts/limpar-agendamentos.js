// scripts/limpar-agendamentos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function limparAgendamentos(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        console.log(`\n🔧 Processando: ${nomeBanco}`);

        if (!fs.existsSync(dbPath)) {
            console.log(`   ⚠️ Banco não encontrado`);
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);

        // 1. Verificar agendamentos existentes
        db.all('SELECT id, cliente_id, data, hora, status FROM agendamentos', (err, rows) => {
            if (err) {
                console.log(`   ⚠️ Tabela agendamentos não existe ou erro: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            if (rows.length === 0) {
                console.log(`   ✅ Nenhum agendamento encontrado`);
                db.close();
                resolve();
                return;
            }

            console.log(`   📋 ${rows.length} agendamentos encontrados`);

            // 2. Mostrar agendamentos
            rows.forEach(r => {
                console.log(`      ID: ${r.id}, Cliente: ${r.cliente_id}, ${r.data} ${r.hora}, Status: ${r.status}`);
            });

            // 3. Remover agendamentos cancelados
            const cancelados = rows.filter(r => r.status === 'cancelado');
            if (cancelados.length > 0) {
                console.log(`   🗑️ Removendo ${cancelados.length} agendamentos cancelados...`);
                db.run('DELETE FROM agendamentos WHERE status = "cancelado"', function (err) {
                    if (err) {
                        console.error(`   ❌ Erro ao remover cancelados: ${err.message}`);
                    } else {
                        console.log(`   ✅ ${this.changes} agendamentos cancelados removidos`);
                    }
                });
            }

            // 4. Perguntar se quer limpar todos
            setTimeout(() => {
                db.all('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                    if (err) {
                        console.error(`   ❌ Erro: ${err.message}`);
                        db.close();
                        resolve();
                        return;
                    }

                    const total = row.total || 0;
                    console.log(`   📊 Após limpeza: ${total} agendamentos restantes`);

                    // 5. Se ainda tiver agendamentos, mostrar
                    if (total > 0) {
                        db.all('SELECT id, data, hora, status FROM agendamentos LIMIT 5', (err, rows) => {
                            if (err) {
                                console.error(`   ❌ Erro: ${err.message}`);
                            } else {
                                console.log(`   📋 Últimos ${rows.length} agendamentos:`);
                                rows.forEach(r => {
                                    console.log(`      ID: ${r.id}, ${r.data} ${r.hora}, Status: ${r.status}`);
                                });
                            }
                            db.close();
                            resolve();
                        });
                    } else {
                        db.close();
                        resolve();
                    }
                });
            }, 500);
        });
    });
}

async function main() {
    console.log('============================================================');
    console.log('🗑️ LIMPANDO AGENDAMENTOS');
    console.log('============================================================\n');

    const databaseDir = path.join(__dirname, '../database');
    if (!fs.existsSync(databaseDir)) {
        console.log('❌ Pasta database não encontrada');
        return;
    }

    // Buscar bancos da empresa 5
    const files = fs.readdirSync(databaseDir)
        .filter(f => f.startsWith('empresa_5') && f.endsWith('.db'));

    if (files.length === 0) {
        console.log('⚠️ Nenhum banco da empresa 5 encontrado');
        return;
    }

    console.log(`📋 ${files.length} bancos da empresa 5 encontrados\n`);

    for (const file of files) {
        const dbPath = path.join(databaseDir, file);
        await limparAgendamentos(dbPath, file);
    }

    console.log('\n============================================================');
    console.log('✅ LIMPEZA CONCLUÍDA!');
    console.log('============================================================');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);