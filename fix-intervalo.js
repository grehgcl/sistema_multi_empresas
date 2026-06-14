const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Corrigindo intervalo dos horários para 30 minutos...');

// Verificar valores atuais
db.all('SELECT dia_semana, intervalo_minutos FROM horarios_funcionamento', (err, rows) => {
    if (err) {
        console.error('Erro:', err.message);
        return;
    }

    console.log('\n📊 Valores atuais:');
    rows.forEach(row => {
        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        console.log(`  ${dias[row.dia_semana]}: ${row.intervalo_minutos} minutos`);
    });

    // Atualizar para 30 minutos
    db.run('UPDATE horarios_funcionamento SET intervalo_minutos = 30', function (err) {
        if (err) {
            console.error('Erro ao atualizar:', err.message);
            return;
        }

        console.log(`\n✅ Atualizado! ${this.changes} registros modificados para 30 minutos.`);

        // Verificar após atualização
        db.all('SELECT dia_semana, intervalo_minutos FROM horarios_funcionamento', (err, rows) => {
            console.log('\n📊 Valores após correção:');
            const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            rows.forEach(row => {
                console.log(`  ${dias[row.dia_semana]}: ${row.intervalo_minutos} minutos`);
            });

            db.close();
        });
    });
});
