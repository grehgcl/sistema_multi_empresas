// scripts/fix-clientes-render.js
const { db, isProduction } = require('../server/config/database');

console.log('🔄 Verificando e corrigindo banco de dados no Render...');

// Verificar se a coluna existe
const sqlCheck = isProduction
    ? `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'clientes' 
       AND column_name = 'dias_bloqueio'`
    : `PRAGMA table_info(clientes)`;

db.all(sqlCheck, [], (err, rows) => {
    if (err) {
        console.error('❌ Erro ao verificar coluna:', err.message);
        return;
    }

    console.log('📋 Resultado da verificação:', rows);

    const existe = rows && rows.length > 0;

    if (!existe) {
        console.log('📝 Adicionando coluna dias_bloqueio...');
        
        const sqlAdd = isProduction
            ? `ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1`
            : `ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1`;
        
        db.run(sqlAdd, [], (err) => {
            if (err) {
                console.error('❌ Erro ao adicionar coluna:', err.message);
                
                // Tentar com IF NOT EXISTS (PostgreSQL)
                if (isProduction) {
                    console.log('🔄 Tentando com IF NOT EXISTS...');
                    const sqlAdd2 = `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_bloqueio INTEGER DEFAULT 1`;
                    db.run(sqlAdd2, [], (err2) => {
                        if (err2) {
                            console.error('❌ Erro novamente:', err2.message);
                        } else {
                            console.log('✅ Coluna adicionada com IF NOT EXISTS!');
                            atualizarClientes();
                        }
                    });
                }
                return;
            }
            console.log('✅ Coluna dias_bloqueio adicionada!');
            atualizarClientes();
        });
    } else {
        console.log('✅ Coluna dias_bloqueio já existe!');
        atualizarClientes();
    }
});

function atualizarClientes() {
    const sqlUpdate = isProduction
        ? `UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL`
        : `UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL`;
    
    db.run(sqlUpdate, [], (err) => {
        if (err) {
            console.error('❌ Erro ao atualizar clientes:', err.message);
        } else {
            console.log('✅ Clientes atualizados com dias_bloqueio = 1');
        }
        
        // Verificar resultado
        const sqlSelect = isProduction
            ? `SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5`
            : `SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5`;
        
        db.all(sqlSelect, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar clientes:', err.message);
            } else {
                console.log('📋 Clientes:');
                rows.forEach(row => {
                    console.log(`  - ID: ${row.id}, Nome: ${row.nome}, Dias Bloqueio: ${row.dias_bloqueio}`);
                });
            }
            console.log('✅ Migração concluída!');
        });
    });
}