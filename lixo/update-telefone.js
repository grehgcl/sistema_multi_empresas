// update-telefone.js
const { db } = require('./server/config/database');

const TELEFONE = '41999003903'; // ← TELEFONE DO DONO
const EMPRESA_ID = 3;

console.log(`📝 Atualizando telefone do dono para empresa ${EMPRESA_ID}...`);

db.run(
    `UPDATE empresas SET telefone_dono = ? WHERE id = ?`,
    [TELEFONE, EMPRESA_ID],
    function(err) {
        if (err) {
            console.error('❌ Erro:', err);
            process.exit(1);
        }
        console.log(`✅ Atualizado! (${this.changes} registros)`);
        
        db.get(
            `SELECT id, nome, telefone_dono FROM empresas WHERE id = ?`,
            [EMPRESA_ID],
            (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar:', err);
                    process.exit(1);
                }
                console.log('📋 Dados atualizados:');
                console.log(`   ID: ${row.id}`);
                console.log(`   Nome: ${row.nome}`);
                console.log(`   Telefone Dono: ${row.telefone_dono || 'NÃO DEFINIDO'}`);
                process.exit(0);
            }
        );
    }
);