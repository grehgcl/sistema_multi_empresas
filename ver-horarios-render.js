const { Client } = require('pg');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔍 VERIFICANDO HORÁRIOS NO RENDER...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('✅ Conectado!\n');

        // Verificar horários da empresa 3 (salaoGreen)
        return client.query(`
            SELECT id, empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim
            FROM horarios_funcionamento 
            WHERE empresa_id = 3
            ORDER BY dia_semana
        `);
    })
    .then((result) => {
        console.log('📋 HORÁRIOS DA EMPRESA 3 (salaoGreen):');
        console.log('='.repeat(70));
        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        if (result.rows.length === 0) {
            console.log('⚠️ Nenhum horário encontrado para empresa 3!');
        } else {
            result.rows.forEach(row => {
                console.log(`  ${dias[row.dia_semana].padEnd(10)} | Aberto: ${row.aberto} | ${row.hora_inicio} - ${row.hora_fim} | Almoço: ${row.almoco_inicio} - ${row.almoco_fim}`);
            });
        }
        console.log('='.repeat(70));
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });