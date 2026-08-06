const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 🔥 CONEXÃO COMPLETA - HOST CORRETO
const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('📤 IMPORTANDO DADOS PARA O RENDER...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// 🔥 USAR O ARQUIVO CORRIGIDO
const pastaExportacao = path.join(__dirname, '../exportacao');
const sqlPath = path.join(pastaExportacao, 'migracao_postgresql_corrigido.sql'); // 🔥 NOME CORRIGIDO

if (!fs.existsSync(sqlPath)) {
    console.error('❌ Arquivo SQL não encontrado:', sqlPath);
    console.log('📝 Execute: node scripts/exportar-estrutura.js');
    process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
console.log(`📤 Usando arquivo: migracao_postgresql_corrigido.sql (${(sql.length / 1024).toFixed(1)} KB)`);

console.log('📤 Conectando ao banco do Render...');

client.connect()
    .then(() => {
        console.log('✅ Conectado ao PostgreSQL do Render!');
        console.log('📝 Executando script de migração...');
        console.log('⚠️ Isso pode levar alguns minutos...');

        return client.query(sql);
    })
    .then(() => {
        console.log('✅ Migração concluída com sucesso!');

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
        console.log('\n📊 RESUMO DOS DADOS IMPORTADOS:');
        console.log('='.repeat(40));
        result.rows.forEach(row => {
            console.log(`  ${row.tabela.padEnd(25)} ${String(row.total).padStart(6)} registros`);
        });
        console.log('='.repeat(40));
        console.log('✅ Importação concluída com sucesso!');
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });