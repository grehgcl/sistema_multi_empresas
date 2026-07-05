const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 🔥 CONEXÃO DO RENDER
const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔄 RECRIANDO BANCO DO RENDER DO ZERO...');
console.log('='.repeat(60));

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Ler o arquivo SQL
const sqlPath = path.join(__dirname, '../exportacao/migracao_postgresql_corrigido.sql');

if (!fs.existsSync(sqlPath)) {
    console.error('❌ Arquivo SQL não encontrado:', sqlPath);
    console.log('📝 Execute: node scripts/exportar-estrutura.js');
    process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
console.log(`📤 Usando arquivo: migracao_postgresql_corrigido.sql (${(sql.length / 1024).toFixed(1)} KB)`);

// ============================================
// 1. CONECTAR E APAGAR TUDO
// ============================================
client.connect()
    .then(() => {
        console.log('✅ Conectado ao PostgreSQL do Render!');
        console.log('📝 Apagando todas as tabelas...');

        // Listar todas as tabelas
        return client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name NOT IN ('pg_stat_statements', 'pg_stat_statements_info')
            ORDER BY table_name
        `);
    })
    .then((result) => {
        const tabelas = result.rows.map(r => r.table_name);
        console.log(`📋 ${tabelas.length} tabelas encontradas para remover:`);
        tabelas.forEach(t => console.log(`   - ${t}`));

        if (tabelas.length === 0) {
            console.log('⚠️ Nenhuma tabela para remover.');
            return Promise.resolve();
        }

        // Apagar todas as tabelas
        const dropQueries = tabelas.map(t => `DROP TABLE IF EXISTS ${t} CASCADE;`).join('\n');
        console.log('\n📝 Removendo tabelas...');
        return client.query(dropQueries);
    })
    .then(() => {
        console.log('✅ Todas as tabelas removidas!\n');
        console.log('📝 Importando novo banco de dados...');
        console.log('⚠️ Isso pode levar alguns minutos...');

        // Executar o SQL completo
        return client.query(sql);
    })
    .then(() => {
        console.log('✅ Banco recriado com sucesso!\n');

        // Verificar os dados importados
        return client.query(`
            SELECT 'empresas' as tabela, COUNT(*) as total FROM empresas
            UNION ALL
            SELECT 'usuarios', COUNT(*) FROM usuarios
            UNION ALL
            SELECT 'profissionais', COUNT(*) FROM profissionais
            UNION ALL
            SELECT 'clientes', COUNT(*) FROM clientes
            UNION ALL
            SELECT 'servicos', COUNT(*) FROM servicos
            UNION ALL
            SELECT 'agendamentos', COUNT(*) FROM agendamentos
            UNION ALL
            SELECT 'despesas', COUNT(*) FROM despesas
            UNION ALL
            SELECT 'horarios_funcionamento', COUNT(*) FROM horarios_funcionamento
            UNION ALL
            SELECT 'planos_historico', COUNT(*) FROM planos_historico
            UNION ALL
            SELECT 'transacoes_pagamento', COUNT(*) FROM transacoes_pagamento
            UNION ALL
            SELECT 'acessos', COUNT(*) FROM acessos
            ORDER BY tabela;
        `);
    })
    .then((result) => {
        console.log('📊 DADOS IMPORTADOS:');
        console.log('='.repeat(40));
        result.rows.forEach(row => {
            console.log(`  ${row.tabela.padEnd(25)} ${String(row.total).padStart(6)} registros`);
        });
        console.log('='.repeat(40));
        console.log('\n✅ BANCO RECRIADO COM SUCESSO!');
        console.log('📝 Agora teste o sistema: https://see-agende.onrender.com');
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });