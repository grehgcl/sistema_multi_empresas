// scripts/limpar-agendamentos.js
// Execute com: node scripts/limpar-agendamentos.js

const { db, isProduction } = require('../server/config/database');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('⚠️  ATENÇÃO: Isso vai deletar TODOS os agendamentos da empresa 3!');
console.log('');

rl.question('Digite o ID da empresa (3) para confirmar: ', (resposta) => {
    if (resposta !== '3') {
        console.log('❌ Cancelado! ID incorreto.');
        rl.close();
        return;
    }

    console.log('🔄 Verificando agendamentos da empresa 3...');

    // Primeiro, contar quantos agendamentos existem
    const sqlCount = isProduction
        ? 'SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = $1'
        : 'SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?';

    db.get(sqlCount, [3], (err, result) => {
        if (err) {
            console.error('❌ Erro ao contar agendamentos:', err.message);
            rl.close();
            return;
        }

        const total = result?.total || 0;
        console.log(`📊 Encontrados ${total} agendamentos na empresa 3`);

        if (total === 0) {
            console.log('✅ Nenhum agendamento para deletar.');
            rl.close();
            return;
        }

        console.log('');
        rl.question(`⚠️  Tem certeza que quer deletar ${total} agendamentos? (s/N): `, (confirm) => {
            if (confirm.toLowerCase() !== 's') {
                console.log('❌ Operação cancelada.');
                rl.close();
                return;
            }

            console.log('🗑️  Deletando agendamentos...');

            const sqlDelete = isProduction
                ? 'DELETE FROM agendamentos WHERE empresa_id = $1'
                : 'DELETE FROM agendamentos WHERE empresa_id = ?';

            db.run(sqlDelete, [3], function (err) {
                if (err) {
                    console.error('❌ Erro ao deletar agendamentos:', err.message);
                } else {
                    console.log(`✅ ${this?.changes || 0} agendamentos deletados com sucesso!`);
                    console.log('✅ Todos os agendamentos da empresa 3 foram removidos.');
                }
                rl.close();
            });
        });
    });
});