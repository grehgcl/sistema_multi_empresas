// scripts/verificar-colunas-empresas.js
const { db } = require('../server/config/database');

console.log('🔍 Verificando colunas da tabela empresas...');

db.all("PRAGMA table_info(empresas)", [], (err, columns) => {
    if (err) {
        console.error('❌ Erro:', err);
        return;
    }

    console.log('📋 Colunas existentes:');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
    });

    // Verificar colunas necessárias
    const colunasNecessarias = ['assinatura_ativa', 'assinatura_valida_ate', 'trial_expira'];
    const colunasExistentes = columns.map(c => c.name);

    console.log('\n🔧 Verificando colunas faltantes...');

    colunasNecessarias.forEach(coluna => {
        if (!colunasExistentes.includes(coluna)) {
            console.log(`⚠️ Coluna "${coluna}" não encontrada. Adicionando...`);
            const sql = `ALTER TABLE empresas ADD COLUMN ${coluna} TEXT`;
            db.run(sql, [], (err) => {
                if (err) {
                    console.error(`❌ Erro ao adicionar ${coluna}:`, err);
                } else {
                    console.log(`✅ Coluna "${coluna}" adicionada com sucesso!`);
                }
            });
        } else {
            console.log(`✅ Coluna "${coluna}" já existe.`);
        }
    });

    setTimeout(() => {
        db.close();
        console.log('\n✅ Verificação concluída!');
    }, 1000);
});