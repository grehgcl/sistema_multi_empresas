// scripts/corrigir-servicos-ativos.js
const { db } = require('../server/config/database');

console.log('🔧 Corrigindo serviços...');

// 1. Atualizar todos os serviços para ativo = 1
db.run('UPDATE servicos SET ativo = 1 WHERE ativo IS NULL OR ativo = 0', function (err) {
    if (err) {
        console.error('❌ Erro:', err);
    } else {
        console.log(`✅ ${this.changes} serviços corrigidos para ativo = 1`);
    }

    // 2. Verificar todos os serviços
    db.all('SELECT id, nome, ativo, valor FROM servicos ORDER BY nome', [], (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err);
        } else {
            console.log('\n📋 Todos os serviços:');
            for (let s of rows) {
                console.log(`  ${s.id}: ${s.nome} - Ativo: ${s.ativo} - R$ ${s.valor}`);
            }
        }
        // ✅ CORRIGIDO: Fechar corretamente
        if (typeof db.close === 'function') {
            db.close();
        }
    });
});