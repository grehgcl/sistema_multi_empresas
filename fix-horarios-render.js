// fix-horarios-render.js
const { Pool } = require('pg');

// 🔥 PEGUE A CONNECTION STRING NO DASHBOARD DO RENDER
// Exemplo: postgresql://seeagende_user:senha@dpg-xxxxx.oregon-postgres.render.com/seeagende
const DATABASE_URL = 'COLE_A_SUA_CONNECTION_STRING_AQUI';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('🚀 INICIANDO CORREÇÃO DOS HORÁRIOS...');
    console.log('='.repeat(50));

    try {
        const client = await pool.connect();
        console.log('✅ Conectado ao banco PostgreSQL!');

        // 1. VER EMPRESAS
        console.log('\n📊 VERIFICANDO EMPRESAS...');
        const empresas = await client.query('SELECT id, nome FROM empresas ORDER BY id');

        if (empresas.rows.length === 0) {
            console.log('❌ Nenhuma empresa encontrada!');
            return;
        }

        console.log(`📌 Encontradas ${empresas.rows.length} empresas`);

        // 2. INSERIR HORÁRIOS
        console.log('\n📝 INSERINDO HORÁRIOS...');
        let totalInseridos = 0;

        for (const empresa of empresas.rows) {
            console.log(`\n📍 Empresa ${empresa.id}: ${empresa.nome}`);

            // Verificar quantos horários já tem
            const check = await client.query(
                'SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1',
                [empresa.id]
            );

            const atual = parseInt(check.rows[0].total);

            if (atual === 7) {
                console.log(`   ✅ Já tem 7 horários configurados`);
                continue;
            }

            console.log(`   ⏳ Inserindo ${7 - atual} horários...`);

            // Inserir os 7 dias da semana
            for (let dia = 0; dia <= 6; dia++) {
                const result = await client.query(`
                    INSERT INTO horarios_funcionamento 
                    (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                    VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30)
                    ON CONFLICT (empresa_id, dia_semana) DO NOTHING
                `, [empresa.id, dia]);

                if (result.rowCount > 0) {
                    totalInseridos++;
                }
            }

            // Verificar resultado
            const novoCheck = await client.query(
                'SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1',
                [empresa.id]
            );

            console.log(`   ✅ Agora tem ${novoCheck.rows[0].total} horários`);
        }

        // 3. RESUMO FINAL
        console.log('\n📊 RESUMO FINAL:');
        console.log('='.repeat(50));

        const resultado = await client.query(`
            SELECT 
                e.id,
                e.nome,
                COUNT(h.id) as total_horarios
            FROM empresas e
            LEFT JOIN horarios_funcionamento h ON e.id = h.empresa_id
            GROUP BY e.id, e.nome
            ORDER BY e.id
        `);

        let ok = 0;
        for (const row of resultado.rows) {
            const status = row.total_horarios === 7 ? '✅ OK' : `⚠️ ${row.total_horarios}/7`;
            console.log(`   Empresa ${row.id}: ${row.nome} - ${row.total_horarios} horários ${status}`);
            if (row.total_horarios === 7) ok++;
        }

        console.log(`\n📌 ${ok}/${resultado.rows.length} empresas configuradas corretamente`);
        console.log(`📌 Total de horários inseridos: ${totalInseridos}`);

        console.log('\n✅ CORREÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('🎉 Agora os novos donos vão conseguir ver os horários disponíveis!');

        client.release();
        await pool.end();

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.log('\n💡 VERIFIQUE:');
        console.log('1. A connection string está correta?');
        console.log('2. O banco no Render está ativo?');
        console.log('3. As credenciais estão certas?');
    }
}

main();