// fix-dates.js - Corrigir datas dos agendamentos
const { db } = require('./server/config/database');

console.log('🔧 CORRIGINDO DATAS DOS AGENDAMENTOS');
console.log('====================================');

// Ver quantos agendamentos têm data errada (29/07)
db.get('SELECT COUNT(*) as total FROM agendamentos WHERE data = "2026-07-29"', (err, row) => {
    if (err) {
        console.error('❌ Erro:', err);
        return;
    }

    console.log(`📊 Encontrados ${row.total} agendamentos com data 2026-07-29`);

    if (row.total > 0) {
        // Corrigir para 2026-07-30
        db.run('UPDATE agendamentos SET data = "2026-07-30" WHERE data = "2026-07-29"', function (err) {
            if (err) {
                console.error('❌ Erro ao corrigir:', err);
                return;
            }
            console.log(`✅ ${this.changes} agendamentos corrigidos para 2026-07-30`);

            // Verificar novamente
            db.all('SELECT id, data, hora FROM agendamentos ORDER BY id DESC LIMIT 5', (err, rows) => {
                if (err) {
                    console.error('❌ Erro:', err);
                    return;
                }
                console.log('\n📊 AGENDAMENTOS ATUALIZADOS:');
                rows.forEach(row => {
                    console.log(`  ID: ${row.id} | Data: ${row.data} | Hora: ${row.hora}`);
                });
                process.exit(0);
            });
        });
    } else {
        console.log('✅ Nenhum agendamento com data 2026-07-29 encontrado');

        // Mostrar as datas atuais
        db.all('SELECT id, data, hora FROM agendamentos ORDER BY id DESC LIMIT 5', (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err);
                return;
            }
            console.log('\n📊 AGENDAMENTOS ATUAIS:');
            rows.forEach(row => {
                console.log(`  ID: ${row.id} | Data: ${row.data} | Hora: ${row.hora}`);
            });
            process.exit(0);
        });
    }
});