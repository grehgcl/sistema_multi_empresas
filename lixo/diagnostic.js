// scripts/diagnostic.js
const { db } = require('../server/config/database');

console.log('?? DIAGN?STICO DO BANCO LOCAL\n');

db.all("PRAGMA table_info(clientes)", [], (err, columns) => {
    if (err) {
        console.error('? Erro:', err.message);
    } else {
        console.log('?? ESTRUTURA DA TABELA clientes:');
        console.table(columns);
    }
    
    db.all("SELECT id, nome, telefone, dias_bloqueio FROM clientes LIMIT 5", [], (err, rows) => {
        if (err) {
            console.error('? Erro ao buscar clientes:', err.message);
        } else {
            console.log('\n?? CLIENTES:');
            console.table(rows);
        }
        
        db.all("SELECT id, cliente_id, data, hora, status, profissional_id FROM agendamentos ORDER BY id DESC LIMIT 5", [], (err, rows) => {
            if (err) {
                console.error('? Erro ao buscar agendamentos:', err.message);
            } else {
                console.log('\n?? ?LTIMOS AGENDAMENTOS:');
                console.table(rows);
            }
            
            db.get("SELECT dias_bloqueio FROM clientes LIMIT 1", [], (err, row) => {
                if (err) {
                    console.log('\n? Coluna dias_bloqueio N?O existe!');
                    console.log('   Erro:', err.message);
                } else {
                    console.log('\n? Coluna dias_bloqueio existe!');
                }
                
                console.log('\n? DIAGN?STICO CONCLU?DO!');
            });
        });
    });
});
