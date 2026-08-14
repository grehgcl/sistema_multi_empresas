// ============================================
// SCRIPT: deletar-empresa-17.js
// Executar: node deletar-empresa-17.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🗑️ DELETANDO EMPRESA 17...\n');

const db = new sqlite3.Database(dbPath);

// 1. Verificar se a empresa existe
db.get('SELECT id, nome FROM empresas WHERE id = 17', (err, row) => {
    if (err) {
        console.error('❌ Erro ao verificar:', err.message);
        db.close();
        return;
    }

    if (!row) {
        console.log('⚠️ Empresa 17 não encontrada');
        db.close();
        return;
    }

    console.log(`📊 Empresa encontrada: ID ${row.id} - ${row.nome}\n`);

    // 2. Deletar usuários da empresa
    db.run('DELETE FROM usuarios WHERE empresa_id = 17', function(err) {
        if (err) {
            console.error('❌ Erro ao deletar usuários:', err.message);
        } else {
            console.log(`✅ Usuários deletados: ${this.changes}`);
        }

        // 3. Deletar a empresa
        db.run('DELETE FROM empresas WHERE id = 17', function(err) {
            if (err) {
                console.error('❌ Erro ao deletar empresa:', err.message);
                db.close();
                return;
            }

            console.log(`✅ Empresa 17 deletada!`);

            // 4. Deletar acessos
            db.run('DELETE FROM acessos WHERE empresa_id = 17', function(err) {
                if (err) {
                    console.error('❌ Erro ao deletar acessos:', err.message);
                } else {
                    console.log(`✅ Acessos deletados: ${this.changes}`);
                }

                // 5. Deletar o banco da empresa
                const empresaDbPath = path.join(__dirname, 'database', 'empresa_17.db');
                if (fs.existsSync(empresaDbPath)) {
                    try {
                        fs.unlinkSync(empresaDbPath);
                        console.log(`✅ Banco empresa_17.db deletado`);
                    } catch (e) {
                        console.log(`⚠️ Erro ao deletar banco: ${e.message}`);
                    }
                } else {
                    console.log(`ℹ️ Banco empresa_17.db não existe`);
                }

                db.close();
                console.log('\n✅ PROCESSO CONCLUÍDO!');
            });
        });
    });
});