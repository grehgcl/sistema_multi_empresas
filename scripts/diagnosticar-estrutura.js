// diagnosticar-estrutura.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/barbearia.db');

console.log('🔍 DIAGNÓSTICO DA TABELA EMPRESAS\n');

// 1. Verificar estrutura
db.all("PRAGMA table_info(empresas)", (err, columns) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log('📋 ESTRUTURA DA TABELA:');
    columns.forEach(col => {
        console.log(`   ${col.name} (${col.type}) - PK: ${col.pk}, Auto: ${col.pk > 0 ? 'SIM' : 'NÃO'}`);
    });

    // 2. Verificar dados
    db.all('SELECT rowid, id, nome FROM empresas ORDER BY rowid DESC LIMIT 10', (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err);
            db.close();
            return;
        }

        console.log('\n📊 ÚLTIMAS EMPRESAS:');
        rows.forEach(r => {
            console.log(`   rowid: ${r.rowid} | id: ${r.id} | nome: ${r.nome}`);
        });

        // 3. Tentar inserir uma empresa de teste
        console.log('\n🧪 TESTE DE INSERÇÃO:');
        db.run(
            `INSERT INTO empresas (nome, plano, trial_expira) VALUES (?, 'trial', datetime('now', '+45 days'))`,
            ['TESTE_INSERCAO_' + Date.now()],
            function(err) {
                if (err) {
                    console.error('❌ Erro ao inserir teste:', err);
                } else {
                    const novoId = this.lastID;
                    console.log(`   ✅ Inserido com ID: ${novoId}`);
                    
                    // Buscar o que foi inserido
                    db.get('SELECT rowid, id, nome FROM empresas WHERE rowid = ?', [novoId], (err, row) => {
                        if (err) {
                            console.error('❌ Erro ao buscar:', err);
                        } else {
                            console.log(`   🔍 Encontrado: rowid=${row?.rowid}, id=${row?.id}, nome=${row?.nome}`);
                        }
                        db.close();
                    });
                }
            }
        );
    });
});