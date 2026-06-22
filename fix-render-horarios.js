// fix-render-horarios.js
const { Pool } = require('pg');

// 🔥 COLOQUE SUA CONNECTION STRING DO RENDER AQUI
const DATABASE_URL = 'postgresql://seeagende_user:SENHA@dpg-xxxxx.oregon-postgres.render.com/seeagende';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixHorarios() {
    console.log('🔧 Conectando ao banco do Render...');

    try {
        const client = await pool.connect();
        console.log('✅ Conectado!');

        // 1. VERIFICAR EMPRESAS
        const empresas = await client.query('SELECT id, nome FROM empresas');
        console.log(`📊 ${empresas.rows.length} empresas encontradas`);

        // 2. INSERIR HORÁRIOS
        let totalInseridos = 0;

        for (const empresa of empresas.rows) {
            // Verificar se já tem horários
            const check = await client.query(
                'SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1',
                [empresa.id]
            );

            if (parseInt(check.rows[0].total) === 7) {
                console.log(`✅ Empresa ${empresa.id} (${empresa.nome}) já tem 7 horários`);
                continue;
            }

            console.log(`📝 Inserindo horários para empresa ${empresa.id} (${empresa.nome})...`);

            // Inserir os 7 dias
            for (let dia = 0; dia <= 6; dia++) {
                await client.query(`
                    INSERT INTO horarios_funcionamento 
                    (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                    VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30)
                    ON CONFLICT (empresa_id, dia_semana) DO NOTHING
                `, [empresa.id, dia]);
                totalInseridos++;
            }

            console.log(`✅ Horários inseridos para empresa ${empresa.id}`);
        }

        // 3. VERIFICAR RESULTADO
        console.log('\n📊 RESULTADO FINAL:');
        const result = await client.query(`
            SELECT 
                e.id,
                e.nome,
                COUNT(h.id) as total_horarios
            FROM empresas e
            LEFT JOIN horarios_funcionamento h ON e.id = h.empresa_id
            GROUP BY e.id, e.nome
            ORDER BY e.id
        `);

        for (const row of result.rows) {
            const status = row.total_horarios === 7 ? '✅ OK' : `⚠️ ${row.total_horarios}/7`;
            console.log(`Empresa ${row.id}: ${row.nome} - ${row.total_horarios} horários ${status}`);
        }

        console.log(`\n✅ Total de horários inseridos: ${totalInseridos}`);
        console.log('🎉 Agora novos donos vão funcionar!');

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

fixHorarios();