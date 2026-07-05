const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 VERIFICANDO USUÁRIOS NO LOCAL...');

db.all(`
    SELECT id, nome, email, role, empresa_id,
           CASE WHEN senha LIKE '$2a$%' THEN '✅ Hash válido' ELSE '❌ Hash inválido' END as status_senha
    FROM usuarios 
    ORDER BY id
`, (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    console.log('📋 USUÁRIOS NO LOCAL:');
    console.log('='.repeat(70));
    rows.forEach(row => {
        console.log(`  ID: ${row.id} | ${row.nome} | ${row.email} | Role: ${row.role} | ${row.status_senha}`);
    });
    console.log('='.repeat(70));
    db.close();
});