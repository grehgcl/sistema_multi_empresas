// fix-clientes-v2.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Corrigindo tabela clientes...\n');

// Adicionar coluna created_at sem DEFAULT
db.run(`ALTER TABLE clientes ADD COLUMN created_at TIMESTAMP`, (err) => {
    if (err && err.message.includes('duplicate column name')) {
        console.log('✅ Coluna created_at já existe');
    } else if (err) {
        console.log('⚠️ Erro ao adicionar created_at:', err.message);
    } else {
        console.log('✅ Coluna created_at adicionada com sucesso!');
        // Atualizar registros existentes com data atual
        db.run(`UPDATE clientes SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);
    }
});

// Verificar a estrutura atual
setTimeout(() => {
    db.all(`PRAGMA table_info(clientes)`, (err, columns) => {
        console.log('\n📊 Estrutura atual da tabela clientes:');
        columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
        });

        // Testar a consulta sem created_at primeiro
        const empresa_id = 1;
        db.all(`SELECT id, nome, telefone, email, COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot 
                FROM clientes 
                WHERE empresa_id = ? 
                ORDER BY nome`,
            [empresa_id],
            (err, clientes) => {
                if (err) {
                    console.log('\n❌ Erro na consulta:', err.message);
                } else {
                    console.log(`\n✅ Consulta funcionou! ${clientes.length} clientes encontrados:`);
                    clientes.forEach(c => {
                        console.log(`   ${c.id} - ${c.nome}`);
                    });
                }
                db.close();
            });
    });
}, 500);