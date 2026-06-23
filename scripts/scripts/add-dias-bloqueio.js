// scripts/add-dias-bloqueio.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/barbearia.db');
console.log('📁 Banco:', dbPath);

const db = new sqlite3.Database(dbPath);

console.log('🔄 Verificando coluna dias_bloqueio...');

db.all("PRAGMA table_info(clientes)", (err, columns) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    const existe = columns.some(col => col.name === 'dias_bloqueio');

    if (existe) {
        console.log('✅ Coluna dias_bloqueio já existe!');
        db.close();
        return;
    }

    console.log('📝 Adicionando coluna dias_bloqueio...');

    db.run("ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1", function (err) {
        if (err) {
            console.error('❌ Erro ao adicionar:', err.message);
            db.close();
            return;
        }

        console.log('✅ Coluna adicionada!');

        db.run("UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL", function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar:', err.message);
            } else {
                console.log(`✅ ${this.changes || 0} clientes atualizados`);
            }

            db.all("SELECT id, nome, dias_bloqueio FROM clientes", (err, rows) => {
                if (!err && rows) {
                    console.log('📋 Clientes:');
                    rows.forEach(row => {
                        console.log(`  - ${row.id}: ${row.nome} (${row.dias_bloqueio} dias)`);
                    });
                }
                db.close();
                console.log('✅ Migração concluída!');
            });
        });
    });
});