const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Adicionando coluna bloqueado_chatbot na tabela clientes...');

// Verificar se a coluna já existe
db.get(`PRAGMA table_info(clientes)`, (err, rows) => {
    // Tentar adicionar a coluna
    db.run(`ALTER TABLE clientes ADD COLUMN bloqueado_chatbot INTEGER DEFAULT 0`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Coluna bloqueado_chatbot já existe!');
            } else {
                console.log('❌ Erro:', err.message);
            }
        } else {
            console.log('✅ Coluna bloqueado_chatbot adicionada com sucesso!');
        }

        // Verificar se a coluna foi adicionada
        db.all(`PRAGMA table_info(clientes)`, (err, cols) => {
            console.log('\n📋 Estrutura da tabela clientes:');
            cols.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });
            db.close();
        });
    });
});