// ============================================
// SCRIPT: corrigir-empresa-17.js
// Executar: node corrigir-empresa-17.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🔧 CORRIGINDO EMPRESA 17...\n');

const db = new sqlite3.Database(dbPath);

// 1. Verificar se a empresa existe
db.get('SELECT id, nome FROM empresas WHERE id = 17', (err, row) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    if (!row) {
        console.log('⚠️ Empresa 17 não encontrada');
        // Verificar qual é a última empresa
        db.get('SELECT id, nome FROM empresas ORDER BY id DESC LIMIT 1', (err, row) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                return;
            }
            console.log(`📋 Última empresa criada: ID ${row.id} - ${row.nome}`);
            console.log('👉 Use o ID da empresa acima nas próximas requisições');
            db.close();
        });
        return;
    }

    console.log(`📊 Empresa encontrada: ${row.id} - ${row.nome}`);

    // 2. Atualizar dados da empresa
    db.run(`
        UPDATE empresas 
        SET 
            telefone_dono = '41999999999',
            endereco = 'Rua Exemplo, 123 - Centro',
            plano = 'trial',
            limite_profissionais = 1,
            assinatura_ativa = 0,
            trial_expira = datetime('now', '+45 days')
        WHERE id = 17
    `, function(err) {
        if (err) {
            console.error('❌ Erro ao atualizar:', err.message);
            db.close();
            return;
        }

        console.log(`✅ Dados da empresa 17 atualizados! (${this.changes} registros)`);

        // 3. Verificar os dados atualizados
        db.get('SELECT id, nome, telefone_dono, endereco, plano FROM empresas WHERE id = 17', (err, row) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                return;
            }

            console.log('\n📋 DADOS ATUALIZADOS:');
            console.log(`   ID: ${row.id}`);
            console.log(`   Nome: ${row.nome}`);
            console.log(`   Telefone: ${row.telefone_dono}`);
            console.log(`   Endereço: ${row.endereco}`);
            console.log(`   Plano: ${row.plano}`);

            db.close();
            console.log('\n✅ PROCESSO CONCLUÍDO!');
        });
    });
});