// scripts/diagnostic.js
const { db } = require('../server/config/database');

console.log('🔍 DIAGNÓSTICO DO BANCO LOCAL\n');

// 1. Verificar estrutura da tabela clientes
console.log('📋 1. ESTRUTURA DA TABELA clientes:');
db.all("PRAGMA table_info(clientes)", [], (err, columns) => {
    if (err) {
        console.error('❌ Erro:', err.message);
    } else {
        console.table(columns);
    }

    // 2. Verificar clientes
    console.log('\n📋 2. CLIENTES:');
    db.all("SELECT id, nome, telefone, dias_bloqueio FROM clientes LIMIT 5", [], (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err.message);
        } else {
            console.table(rows);
        }

        // 3. Verificar agendamentos
        console.log('\n📋 3. ÚLTIMOS AGENDAMENTOS:');
        db.all("SELECT id, cliente_id, data, hora, status, profissional_id FROM agendamentos ORDER BY id DESC LIMIT 5", [], (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err.message);
            } else {
                console.table(rows);
            }

            // 4. Verificar se a coluna dias_bloqueio existe
            console.log('\n📋 4. VERIFICANDO COLUNA dias_bloqueio:');
            db.get("SELECT dias_bloqueio FROM clientes LIMIT 1", [], (err, row) => {
                if (err) {
                    console.log('❌ Coluna dias_bloqueio NÃO existe!');
                    console.log('   Erro:', err.message);
                } else {
                    console.log('✅ Coluna dias_bloqueio existe!');
                    console.log('   Valor exemplo:', row);
                }

                console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
            });
        });
    });
});