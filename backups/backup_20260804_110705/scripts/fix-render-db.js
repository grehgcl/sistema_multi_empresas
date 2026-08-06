// scripts/fix-render-db.js
// Execute no Render: node scripts/fix-render-db.js

const { db, isProduction } = require('../server/config/database');

console.log('🔄 Corrigindo banco de dados no Render...');
console.log('📌 Ambiente:', isProduction ? 'PRODUÇÃO (PostgreSQL)' : 'DESENVOLVIMENTO (SQLite)');

// Verificar se a coluna existe
const sqlCheck = isProduction
    ? "SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'dias_bloqueio'"
    : "PRAGMA table_info(clientes)";

db.all(sqlCheck, [], (err, rows) => {
    if (err) {
        console.error('❌ Erro ao verificar coluna:', err.message);
        return;
    }

    const existe = rows && rows.length > 0;
    console.log('📋 Coluna existe?', existe);

    if (!existe) {
        console.log('📝 Adicionando coluna dias_bloqueio...');
        
        const sqlAdd = isProduction
            ? 'ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1'
            : 'ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1';
        
        db.run(sqlAdd, [], (err) => {
            if (err) {
                console.error('❌ Erro ao adicionar coluna:', err.message);
                return;
            }
            console.log('✅ Coluna adicionada!');
            atualizarClientes();
        });
    } else {
        console.log('✅ Coluna já existe!');
        atualizarClientes();
    }
});

function atualizarClientes() {
    console.log('📝 Atualizando clientes existentes...');
    
    const sqlUpdate = isProduction
        ? "UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL"
        : "UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL";
    
    db.run(sqlUpdate, [], (err) => {
        if (err) {
            console.error('❌ Erro ao atualizar clientes:', err.message);
        } else {
            console.log('✅ Clientes atualizados!');
        }
        
        // Verificar resultado
        const sqlSelect = isProduction
            ? "SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5"
            : "SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5";
        
        db.all(sqlSelect, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar clientes:', err.message);
            } else {
                console.log('📋 Clientes:');
                if (rows && rows.length > 0) {
                    rows.forEach(row => {
                        console.log('  - ID: ' + row.id + ', Nome: ' + row.nome + ', Dias Bloqueio: ' + row.dias_bloqueio);
                    });
                } else {
                    console.log('  Nenhum cliente encontrado');
                }
            }
            console.log('✅ Correção concluída!');
        });
    });
}
