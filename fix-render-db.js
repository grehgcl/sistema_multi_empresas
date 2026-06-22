// fix-render-db.js - Corrigir banco no Render (VERSÃO CORRIGIDA)
const { Pool } = require('pg');

// 🔥 COLOQUE A SUA STRING DE CONEXÃO DO RENDER AQUI
// PEGUE NO DASHBOARD DO RENDER
const DATABASE_URL = 'postgresql://usuario:senha@host:5432/database';

// OPÇÃO 1: Usar Pool com SSL
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // IMPORTANTE para Render
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// OPÇÃO 2: Se a OPÇÃO 1 não funcionar, descomente esta
/*
const pool = new Pool({
    host: 'dpg-xxxxxxxxxxxx.oregon-postgres.render.com',
    port: 5432,
    database: 'seeagende',
    user: 'seeagende_user',
    password: 'sua_senha',
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
*/

async function fixDatabase() {
    console.log('🔧 Tentando conectar ao PostgreSQL no Render...');
    console.log(`📡 Host: ${pool.options.host || 'via connection string'}`);
    console.log(`📡 Database: ${pool.options.database || 'via connection string'}`);
    console.log('⏳ Aguardando conexão...');

    let client = null;

    try {
        client = await pool.connect();
        console.log('✅ Conectado com sucesso!');

        // 1. VERIFICAR SE A TABELA EXISTE
        console.log('📝 Verificando tabela horarios_funcionamento...');

        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'horarios_funcionamento'
            );
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Tabela já existe!');
        } else {
            console.log('📝 Criando tabela horarios_funcionamento...');
            await client.query(`
                CREATE TABLE horarios_funcionamento (
                    id SERIAL PRIMARY KEY,
                    empresa_id INTEGER NOT NULL,
                    dia_semana INTEGER NOT NULL,
                    aberto INTEGER DEFAULT 1,
                    hora_inicio VARCHAR(5) DEFAULT '09:00',
                    hora_fim VARCHAR(5) DEFAULT '18:00',
                    almoco_inicio VARCHAR(5) DEFAULT '12:00',
                    almoco_fim VARCHAR(5) DEFAULT '13:00',
                    intervalo_minutos INTEGER DEFAULT 30,
                    CONSTRAINT unique_empresa_dia UNIQUE (empresa_id, dia_semana)
                )
            `);
            console.log('✅ Tabela criada!');
        }

        // 2. VERIFICAR EMPRESAS
        console.log('📝 Verificando empresas...');
        const empresas = await client.query(`
            SELECT id, nome FROM empresas ORDER BY id
        `);

        if (empresas.rows.length === 0) {
            console.log('⚠️ Nenhuma empresa encontrada no banco!');
            client.release();
            await pool.end();
            return;
        }

        console.log(`📊 Encontradas ${empresas.rows.length} empresas`);

        // 3. INSERIR HORÁRIOS PARA CADA EMPRESA
        console.log('📝 Inserindo horários para todas as empresas...');
        let totalInseridos = 0;

        for (const empresa of empresas.rows) {
            console.log(`  📍 Empresa ${empresa.id}: ${empresa.nome}`);

            // Verificar quantos horários já tem
            const countResult = await client.query(`
                SELECT COUNT(*) as total 
                FROM horarios_funcionamento 
                WHERE empresa_id = $1
            `, [empresa.id]);

            const totalAtual = parseInt(countResult.rows[0].total);

            if (totalAtual === 7) {
                console.log(`    ✅ Já tem 7 horários configurados`);
                continue;
            }

            console.log(`    ⏳ Inserindo ${7 - totalAtual} horários faltantes...`);

            // Inserir horários para os 7 dias da semana
            const result = await client.query(`
                INSERT INTO horarios_funcionamento 
                (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                VALUES 
                ($1, 0, 1, '09:00', '18:00', '12:00', '13:00', 30),
                ($1, 1, 1, '09:00', '18:00', '12:00', '13:00', 30),
                ($1, 2, 1, '09:00', '18:00', '12:00', '13:00', 30),
                ($1, 3, 1, '09:00', '18:00', '12:00', '13:00', 30),
                ($1, 4, 1, '09:00', '18:00', '12:00', '13:00', 30),
                ($1, 5, 1, '09:00', '18:00', '12:00', '13:00', 30),
                ($1, 6, 1, '09:00', '18:00', '12:00', '13:00', 30)
                ON CONFLICT (empresa_id, dia_semana) DO NOTHING
            `, [empresa.id]);

            // Verificar resultado
            const newCount = await client.query(`
                SELECT COUNT(*) as total 
                FROM horarios_funcionamento 
                WHERE empresa_id = $1
            `, [empresa.id]);

            totalInseridos += parseInt(newCount.rows[0].total) - totalAtual;
            console.log(`    ✅ Agora tem ${newCount.rows[0].total} horários`);
        }

        // 4. RESUMO FINAL
        console.log('\n📊 RESUMO FINAL:');
        console.log('=================');

        const finalResult = await client.query(`
            SELECT 
                e.id,
                e.nome,
                COUNT(h.id) as total_horarios
            FROM empresas e
            LEFT JOIN horarios_funcionamento h ON e.id = h.empresa_id
            GROUP BY e.id, e.nome
            ORDER BY e.id
        `);

        let totalEmpresasOK = 0;
        for (const row of finalResult.rows) {
            const status = row.total_horarios === 7 ? '✅ OK' : `⚠️ ${row.total_horarios}/7`;
            console.log(`Empresa ${row.id}: ${row.nome} - ${row.total_horarios} horários ${status}`);
            if (row.total_horarios === 7) totalEmpresasOK++;
        }

        console.log(`\n✅ ${totalEmpresasOK}/${finalResult.rows.length} empresas configuradas corretamente`);
        console.log(`📌 Total de horários inseridos: ${totalInseridos}`);

        client.release();
        console.log('\n✅ CORREÇÃO CONCLUÍDA!');
        console.log('Agora novos donos vão funcionar no Render! 🎉');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('📋 Detalhes:', error);

        console.log('\n💡 DICAS:');
        console.log('1. Verifique se a string de conexão está correta');
        console.log('2. Verifique se o banco no Render está ativo');
        console.log('3. Copie a Connection String exata do Dashboard do Render');
        console.log('4. Substitua DATABASE_URL no script');

    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// Executar
fixDatabase();