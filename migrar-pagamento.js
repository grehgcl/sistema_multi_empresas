const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 ADICIONANDO COLUNAS...');

const colunas = [
    { nome: 'forma_pagamento', sql: "ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT DEFAULT 'dinheiro'" },
    { nome: 'prazo_dias', sql: 'ALTER TABLE agendamentos ADD COLUMN prazo_dias INTEGER DEFAULT 0' },
    { nome: 'data_vencimento', sql: 'ALTER TABLE agendamentos ADD COLUMN data_vencimento DATE' },
    { nome: 'descricao_pagamento', sql: 'ALTER TABLE agendamentos ADD COLUMN descricao_pagamento TEXT' }
];

let count = 0;
colunas.forEach(function(c) {
    db.run(c.sql, function(err) {
        if (err) {
            if (err.message.indexOf('duplicate column name') > -1) {
                console.log('⚠️ Coluna ' + c.nome + ' já existe');
            } else {
                console.log('❌ Erro ao adicionar ' + c.nome + ': ' + err.message);
            }
        } else {
            console.log('✅ Coluna ' + c.nome + ' adicionada');
        }
        count++;
        if (count === colunas.length) {
            console.log('✅ MIGRAÇÃO CONCLUÍDA!');
            db.close();
        }
    });
});
