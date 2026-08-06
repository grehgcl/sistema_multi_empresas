// scripts/atualizar-telefone-donos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database/barbearia.db'));

console.log('📝 Atualizando telefones dos donos...');

// Buscar todos os donos com telefone
db.all(`
    SELECT u.id, u.empresa_id, u.telefone, e.nome as empresa_nome
    FROM usuarios u
    JOIN empresas e ON u.empresa_id = e.id
    WHERE u.role = 'dono' 
    AND u.telefone IS NOT NULL 
    AND u.telefone != ''
`, (err, donos) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log(`📊 Encontrados ${donos.length} donos com telefone`);

    let atualizados = 0;
    let erro = 0;

    donos.forEach((dono) => {
        db.run(
            `UPDATE empresas SET telefone_dono = ? WHERE id = ?`,
            [dono.telefone, dono.empresa_id],
            function (err) {
                if (err) {
                    console.error(`❌ Erro ao atualizar empresa ${dono.empresa_id}:`, err);
                    erro++;
                } else {
                    atualizados++;
                    console.log(`✅ ${dono.empresa_nome} → ${dono.telefone}`);
                }

                if (atualizados + erro === donos.length) {
                    console.log('');
                    console.log('📊 RESUMO:');
                    console.log(`   ✅ Atualizados: ${atualizados}`);
                    console.log(`   ❌ Erros: ${erro}`);
                    db.close();
                }
            }
        );
    });

    if (donos.length === 0) {
        console.log('✅ Nenhum dono com telefone para atualizar');
        db.close();
    }
});