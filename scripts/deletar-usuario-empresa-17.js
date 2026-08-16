// ============================================
// SCRIPT: deletar-usuario-empresa-17.js
// Executar: node deletar-usuario-empresa-17.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🗑️ DELETANDO USUÁRIO E EMPRESA 17...\n');

const db = new sqlite3.Database(dbPath);

// 1. Verificar usuário com empresa 17
db.get('SELECT id, nome, email, empresa_id FROM usuarios WHERE empresa_id = 17', (err, user) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    if (!user) {
        console.log('⚠️ Usuário com empresa 17 não encontrado');
        db.close();
        return;
    }

    console.log(`📊 Usuário encontrado: ${user.id} - ${user.nome} (${user.email})`);

    // 2. Deletar usuário
    db.run('DELETE FROM usuarios WHERE empresa_id = 17', function(err) {
        if (err) {
            console.error('❌ Erro ao deletar usuário:', err.message);
            db.close();
            return;
        }

        console.log(`✅ Usuário deletado (${this.changes} registros)`);

        // 3. Deletar empresa 17
        db.run('DELETE FROM empresas WHERE id = 17', function(err) {
            if (err) {
                console.error('❌ Erro ao deletar empresa:', err.message);
                db.close();
                return;
            }

            console.log(`✅ Empresa 17 deletada (${this.changes} registros)`);

            // 4. Deletar banco da empresa 17
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

            // 5. Listar usuários restantes
            db.all('SELECT id, nome, email, empresa_id FROM usuarios ORDER BY id', (err, rows) => {
                if (err) {
                    console.error('❌ Erro:', err.message);
                    db.close();
                    return;
                }

                console.log('\n📋 USUÁRIOS RESTANTES:');
                for (const row of rows) {
                    console.log(`   ${row.id} - ${row.nome} (${row.email}) - Empresa: ${row.empresa_id}`);
                }

                db.close();
                console.log('\n✅ PROCESSO CONCLUÍDO!');
            });
        });
    });
});