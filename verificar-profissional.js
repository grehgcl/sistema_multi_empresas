// verificar-profissional.js
const { db } = require('./server/config/database');

console.log('🔍 Verificando profissional ID 1001...');

// Verificar na tabela profissionais
db.get('SELECT id, nome, email, empresa_id, comissao_percent FROM profissionais WHERE id = ?', [1001], (err, profissional) => {
    if (err) {
        console.error('❌ Erro ao buscar profissional:', err.message);
        process.exit();
    }

    if (profissional) {
        console.log('✅ PROFISSIONAL ENCONTRADO na tabela profissionais:');
        console.log(`   ID: ${profissional.id}`);
        console.log(`   Nome: ${profissional.nome}`);
        console.log(`   Email: ${profissional.email}`);
        console.log(`   Empresa ID: ${profissional.empresa_id}`);
        console.log(`   Comissão: ${profissional.comissao_percent}%`);
    } else {
        console.log('❌ Profissional ID 1001 NÃO ENCONTRADO na tabela profissionais');

        // Verificar se existe na tabela usuarios
        db.get('SELECT id, nome, email, role, empresa_id FROM usuarios WHERE id = ?', [1001], (err, usuario) => {
            if (err) {
                console.error('❌ Erro ao buscar usuário:', err.message);
                process.exit();
            }

            if (usuario) {
                console.log('📋 USUÁRIO ENCONTRADO na tabela usuarios:');
                console.log(`   ID: ${usuario.id}`);
                console.log(`   Nome: ${usuario.nome}`);
                console.log(`   Email: ${usuario.email}`);
                console.log(`   Role: ${usuario.role}`);
                console.log(`   Empresa ID: ${usuario.empresa_id}`);
                console.log('\n⚠️ Este usuário está na tabela usuarios, mas NÃO na tabela profissionais!');
                console.log('   O sistema precisa que ele esteja na tabela profissionais para editar.');
            } else {
                console.log('❌ Usuário ID 1001 NÃO ENCONTRADO em nenhuma tabela!');
            }
            process.exit();
        });
    }
});