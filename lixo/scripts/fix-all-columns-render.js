// scripts/fix-all-columns-render.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak',
    ssl: { rejectUnauthorized: false }
});

async function fixAllColumns() {
    try {
        console.log('🔄 Conectando ao banco do Render...');

        // ============================================
        // 1. ADICIONAR COLUNA telefone NA TABELA profissionais
        // ============================================
        console.log('📝 Verificando coluna telefone em profissionais...');
        try {
            await pool.query(`
                ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS telefone TEXT
            `);
            console.log('✅ Coluna telefone adicionada em profissionais!');
        } catch (e) {
            console.log('⚠️ Erro ao adicionar telefone:', e.message);
        }

        // ============================================
        // 2. ADICIONAR COLUNA agendamentos_mes NA TABELA empresas
        // ============================================
        console.log('📝 Verificando coluna agendamentos_mes em empresas...');
        try {
            await pool.query(`
                ALTER TABLE empresas ADD COLUMN IF NOT EXISTS agendamentos_mes INTEGER DEFAULT 0
            `);
            console.log('✅ Coluna agendamentos_mes adicionada em empresas!');
        } catch (e) {
            console.log('⚠️ Erro ao adicionar agendamentos_mes:', e.message);
        }

        // ============================================
        // 3. ADICIONAR COLUNA mes_referencia NA TABELA empresas
        // ============================================
        console.log('📝 Verificando coluna mes_referencia em empresas...');
        try {
            await pool.query(`
                ALTER TABLE empresas ADD COLUMN IF NOT EXISTS mes_referencia TEXT
            `);
            console.log('✅ Coluna mes_referencia adicionada em empresas!');
        } catch (e) {
            console.log('⚠️ Erro ao adicionar mes_referencia:', e.message);
        }

        // ============================================
        // 4. ADICIONAR COLUNA lembrete_enviado NA TABELA agendamentos
        // ============================================
        console.log('📝 Verificando coluna lembrete_enviado em agendamentos...');
        try {
            await pool.query(`
                ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_enviado INTEGER DEFAULT 0
            `);
            console.log('✅ Coluna lembrete_enviado adicionada em agendamentos!');
        } catch (e) {
            console.log('⚠️ Erro ao adicionar lembrete_enviado:', e.message);
        }

        // ============================================
        // 5. VERIFICAR COLUNA dias_bloqueio NA TABELA clientes
        // ============================================
        console.log('📝 Verificando coluna dias_bloqueio em clientes...');
        try {
            await pool.query(`
                ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_bloqueio INTEGER DEFAULT 1
            `);
            console.log('✅ Coluna dias_bloqueio adicionada em clientes!');
        } catch (e) {
            console.log('⚠️ Erro ao adicionar dias_bloqueio:', e.message);
        }

        // ============================================
        // 6. ATUALIZAR DADOS EXISTENTES
        // ============================================
        console.log('📝 Atualizando dados existentes...');

        // Atualizar agendamentos_mes
        await pool.query(`
            UPDATE empresas SET agendamentos_mes = 0 WHERE agendamentos_mes IS NULL
        `);

        // Atualizar mes_referencia
        const mesAtual = new Date().toISOString().slice(0, 7);
        await pool.query(`
            UPDATE empresas SET mes_referencia = $1 WHERE mes_referencia IS NULL
        `, [mesAtual]);

        // Atualizar dias_bloqueio
        await pool.query(`
            UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL
        `);

        // Atualizar lembrete_enviado
        await pool.query(`
            UPDATE agendamentos SET lembrete_enviado = 0 WHERE lembrete_enviado IS NULL
        `);

        console.log('✅ Dados atualizados!');

        // ============================================
        // 7. VERIFICAR SE TUDO FUNCIONOU
        // ============================================
        console.log('\n📋 VERIFICANDO ESTRUTURA:');

        // Verificar profissionais
        const profCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profissionais' 
            AND column_name = 'telefone'
        `);
        console.log('  - telefone em profissionais:', profCheck.rows.length > 0 ? '✅' : '❌');

        // Verificar empresas
        const empCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'empresas' 
            AND column_name IN ('agendamentos_mes', 'mes_referencia')
        `);
        console.log('  - agendamentos_mes em empresas:', empCheck.rows.some(r => r.column_name === 'agendamentos_mes') ? '✅' : '❌');
        console.log('  - mes_referencia em empresas:', empCheck.rows.some(r => r.column_name === 'mes_referencia') ? '✅' : '❌');

        // Verificar clientes
        const cliCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clientes' 
            AND column_name = 'dias_bloqueio'
        `);
        console.log('  - dias_bloqueio em clientes:', cliCheck.rows.length > 0 ? '✅' : '❌');

        console.log('\n✅ CORREÇÃO CONCLUÍDA!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

fixAllColumns();