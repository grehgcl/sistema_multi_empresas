// ============================================
// SCRIPT: deletar-gregorio.js
// Executar: node deletar-gregorio.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🗑️ DELETANDO EMPRESA "gregorio spas"...\n');

const db = new sqlite3.Database(dbPath);

// 1. Buscar a empresa
db.all("SELECT rowid, id, nome FROM empresas WHERE nome LIKE '%gregorio%' OR nome LIKE '%Gregorio%'", (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('⚠️ Nenhuma empresa com "gregorio" encontrada');
        db.close();
        return;
    }

    console.log('📊 Empresas encontradas:');
    for (const row of rows) {
        console.log(`   rowid: ${row.rowid}, id: ${row.id}, nome: ${row.nome}`);
    }

    // 2. Deletar usando rowid (funciona mesmo com id null)
    db.run("DELETE FROM empresas WHERE nome LIKE '%gregorio%' OR nome LIKE '%Gregorio%'", function(err) {
        if (err) {
            console.error('❌ Erro ao deletar empresa:', err.message);
            db.close();
            return;
        }

        console.log(`✅ ${this.changes} empresas deletadas`);

        // 3. Deletar usuários relacionados
        db.run("DELETE FROM usuarios WHERE nome LIKE '%gregorio%' OR nome LIKE '%Gregorio%'", function(err) {
            if (err) {
                console.error('❌ Erro ao deletar usuários:', err.message);
                db.close();
                return;
            }

            console.log(`✅ ${this.changes} usuários deletados`);

            // 4. Deletar acessos relacionados
            db.run("DELETE FROM acessos WHERE usuario_id IN (SELECT id FROM usuarios WHERE nome LIKE '%gregorio%')", function(err) {
                if (err) {
                    console.error('❌ Erro ao deletar acessos:', err.message);
                } else {
                    console.log(`✅ ${this.changes} acessos deletados`);
                }

                // 5. Listar empresas restantes
                db.all('SELECT id, nome FROM empresas ORDER BY id', (err, rows) => {
                    if (err) {
                        console.error('❌ Erro:', err.message);
                        db.close();
                        return;
                    }

                    console.log('\n📋 EMPRESAS RESTANTES:');
                    for (const row of rows) {
                        console.log(`   ${row.id} - ${row.nome}`);
                    }

                    db.close();
                    console.log('\n✅ PROCESSO CONCLUÍDO!');
                });
            });
        });
    });
});