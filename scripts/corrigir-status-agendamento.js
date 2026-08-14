// scripts/corrigir-status-agendamento.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database/empresa_5.db');

const AGENDAMENTO_ID = 363;

console.log('============================================================');
console.log('🔧 CORRIGINDO STATUS DO AGENDAMENTO');
console.log('============================================================\n');

// 1. Verificar o agendamento
db.get('SELECT id, status, forma_pagamento FROM agendamentos WHERE id = ?', [AGENDAMENTO_ID], (err, row) => {
    if (err) {
        console.error('❌ Erro ao buscar:', err);
        db.close();
        return;
    }

    if (!row) {
        console.log(`⚠️ Agendamento ${AGENDAMENTO_ID} não encontrado`);
        db.close();
        return;
    }

    console.log('📋 Agendamento encontrado:');
    console.log(`   ID: ${row.id}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Forma Pagamento: ${row.forma_pagamento || 'N/A'}`);

    if (row.status === 'concluido') {
        console.log('\n✅ Agendamento já está concluído!');
        db.close();
        return;
    }

    // 2. Atualizar para concluido
    db.run('UPDATE agendamentos SET status = "concluido", forma_pagamento = "dinheiro" WHERE id = ?', [AGENDAMENTO_ID], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar:', err);
            db.close();
            return;
        }

        console.log(`\n✅ Agendamento ${AGENDAMENTO_ID} atualizado para concluido`);
        console.log(`   ${this.changes} registro(s) afetado(s)`);

        // 3. Verificar novamente
        db.get('SELECT id, status, forma_pagamento FROM agendamentos WHERE id = ?', [AGENDAMENTO_ID], (err, row) => {
            if (err) {
                console.error('❌ Erro na verificação:', err);
                db.close();
                return;
            }

            console.log('\n📋 Verificação final:');
            console.log(`   ID: ${row.id}`);
            console.log(`   Status: ${row.status}`);
            console.log(`   Forma Pagamento: ${row.forma_pagamento || 'N/A'}`);

            console.log('\n============================================================');
            console.log('✅ CORREÇÃO CONCLUÍDA!');
            console.log('============================================================');
            console.log('📝 Reinicie o servidor: npm start');
            db.close();
        });
    });
});