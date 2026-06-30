// fix-now.js (VERSÃO CORRIGIDA)
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com:5432/barbearia_noak';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('🚀 CONECTANDO AO BANCO...');

    try {
        const client = await pool.connect();
        console.log('✅ Conectado!');

        // ========================================
        // 1. CRIAR A CONSTRAINT UNIQUE (SE NÃO EXISTIR)
        // ========================================
        console.log('\n📝 VERIFICANDO/CRIANDO CONSTRAINT UNIQUE...');

        try {
            await client.query(`
                ALTER TABLE horarios_funcionamento 
                ADD CONSTRAINT unique_empresa_dia UNIQUE (empresa_id, dia_semana)
            `);
            console.log('✅ Constraint UNIQUE criada!');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('✅ Constraint UNIQUE já existe!');
            } else {
                console.log('⚠️ Erro ao criar constraint:', err.message);
                console.log('📌 Continuando sem constraint...');
            }
        }

        // ========================================
        // 2. VER EMPRESAS
        // ========================================
        console.log('\n📊 BUSCANDO EMPRESAS...');
        const empresas = await client.query('SELECT id, nome FROM empresas ORDER BY id');

        if (empresas.rows.length === 0) {
            console.log('❌ Nenhuma empresa encontrada!');
            return;
        }

        console.log(`📌 Encontradas ${empresas.rows.length} empresas`);

        // ========================================
        // 3. INSERIR HORÁRIOS (SEM ON CONFLICT)
        // ========================================
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

            // Inserir os 7 dias da semana (USANDO DELETE + INSERT)
            for (let dia = 0; dia <= 6; dia++) {
                // Primeiro verifica se já existe
                const exists = await client.query(
                    'SELECT id FROM horarios_funcionamento WHERE empresa_id = $1 AND dia_semana = $2',
                    [empresa.id, dia]
                );

                if (exists.rows.length === 0) {
                    // Se não existe, insere
                    await client.query(`
                        INSERT INTO horarios_funcionamento 
                        (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                        VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30)
                    `, [empresa.id, dia]);
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

        // ========================================
        // 4. RESUMO FINAL
        // ========================================
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