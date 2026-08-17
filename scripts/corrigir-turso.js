// scripts/corrigir-turso.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@libsql/client');

console.log('Corrigindo Turso...');
console.log('');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Turso nao configurado no .env');
    console.error('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);
    console.error('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'Configurado' : 'Nao configurado');
    process.exit(1);
}

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function corrigir() {
    try {
        // 1. Adicionar coluna payment_mode
        console.log('Adicionando coluna payment_mode...');
        try {
            await client.execute("ALTER TABLE configuracoes ADD COLUMN payment_mode TEXT DEFAULT 'simulation'");
            console.log('   Coluna payment_mode adicionada');
        } catch (err) {
            if (err.message && err.message.includes('duplicate column')) {
                console.log('   Coluna payment_mode ja existe');
            } else {
                console.log('   Erro:', err.message);
            }
        }

        // 2. Inserir configuração padrão
        console.log('Inserindo configuracao padrao...');
        try {
            await client.execute("INSERT OR REPLACE INTO configuracoes (chave, valor, payment_mode) VALUES ('payment_mode', 'simulation', 'simulation')");
            console.log('   Configuracao padrao inserida');
        } catch (err) {
            console.log('   Erro:', err.message);
        }

        // 3. Verificar tabelas
        console.log('Verificando tabelas...');
        const tables = ['empresas', 'usuarios', 'clientes', 'servicos', 'profissionais', 'agendamentos', 'despesas', 'horarios_funcionamento', 'configuracoes'];
        for (const table of tables) {
            try {
                const result = await client.execute('SELECT COUNT(*) as total FROM ' + table);
                console.log('   ' + table + ': ' + result.rows[0].total + ' registros');
            } catch (err) {
                console.log('   ' + table + ': nao encontrada');
            }
        }

        console.log('');
        console.log('CORRECOES CONCLUIDAS!');
        process.exit(0);
    } catch (err) {
        console.error('Erro:', err.message);
        process.exit(1);
    }
}

corrigir();