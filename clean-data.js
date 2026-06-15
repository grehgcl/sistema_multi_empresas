// clean-data.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🗑️ Iniciando limpeza de dados...\n');

db.serialize(() => {
    // 1. Ver quantos registros existem antes
    db.get("SELECT COUNT(*) as total FROM agendamentos", (err, result) => {
        console.log(`📊 Agendamentos antes: ${result?.total || 0}`);
    });

    db.get("SELECT COUNT(*) as total FROM clientes", (err, result) => {
        console.log(`📊 Clientes antes: ${result?.total || 0}`);
    });

    // 2. Limpar agendamentos
    db.run("DELETE FROM agendamentos", (err) => {
        if (err) {
            console.log('❌ Erro ao limpar agendamentos:', err.message);
        } else {
            console.log('✅ Agendamentos removidos com sucesso');
        }
    });

    // 3. Limpar clientes
    db.run("DELETE FROM clientes", (err) => {
        if (err) {
            console.log('❌ Erro ao limpar clientes:', err.message);
        } else {
            console.log('✅ Clientes removidos com sucesso');
        }
    });

    // 4. Resetar IDs das tabelas (opcional)
    db.run("DELETE FROM sqlite_sequence WHERE name='agendamentos'", (err) => {
        if (!err) console.log('✅ Reset ID agendamentos');
    });

    db.run("DELETE FROM sqlite_sequence WHERE name='clientes'", (err) => {
        if (!err) console.log('✅ Reset ID clientes');
    });
});

setTimeout(() => {
    // Verificar depois
    db.get("SELECT COUNT(*) as total FROM agendamentos", (err, result) => {
        console.log(`\n📊 Agendamentos depois: ${result?.total || 0}`);
    });

    db.get("SELECT COUNT(*) as total FROM clientes", (err, result) => {
        console.log(`📊 Clientes depois: ${result?.total || 0}`);
    });

    console.log('\n✅ Limpeza concluída!');
    console.log('\n📝 Agora você pode recriar os dados de teste:');
    console.log('   - Cadastre novos clientes');
    console.log('   - Crie agendamentos de teste');
    console.log('   - Teste o sistema de planos');

    db.close();
}, 1000);