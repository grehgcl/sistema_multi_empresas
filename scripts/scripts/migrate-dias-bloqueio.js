// scripts/migrate-dias-bloqueio.js
// Adiciona coluna dias_bloqueio na tabela clientes
// Execute: node scripts/migrate-dias-bloqueio.js

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../database/barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Conectado ao banco:', dbPath);
console.log('🔄 Adicionando coluna dias_bloqueio na tabela clientes...');

// Verificar se a coluna já existe
db.get("PRAGMA table_info(clientes)", (err, columns) => {
    if (err) {
        console.error('❌ Erro ao verificar tabela:', err.message);
        db.close();
        return;
    }

    // Verificar se a coluna dias_bloqueio já existe
    db.all("PRAGMA table_info(clientes)", (err, rows) => {
        if (err) {
            console.error('❌ Erro ao verificar colunas:', err.message);
            db.close();
            return;
        }

        const colunaExiste = rows.some(row => row.name === 'dias_bloqueio');

        if (colunaExiste) {
            console.log('✅ Coluna dias_bloqueio já existe!');
            db.close();
            return;
        }

        // Adicionar a coluna
        db.run("ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1", function (err) {
            if (err) {
                console.error('❌ Erro ao adicionar coluna:', err.message);
                db.close();
                return;
            }

            console.log('✅ Coluna dias_bloqueio adicionada com sucesso!');

            // Atualizar clientes existentes
            db.run("UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL", function (err) {
                if (err) {
                    console.error('❌ Erro ao atualizar clientes:', err.message);
                } else {
                    console.log(`✅ ${this.changes || 0} clientes atualizados com dias_bloqueio = 1`);
                }

                // Verificar se deu certo
                db.get("SELECT COUNT(*) as total FROM clientes WHERE dias_bloqueio IS NOT NULL", (err, row) => {
                    if (!err && row) {
                        console.log(`✅ ${row.total} clientes com dias_bloqueio configurado`);
                    }
                    db.close();
                    console.log('✅ Migração concluída!');
                });
            });
        });
    });
});