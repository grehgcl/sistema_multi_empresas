// verificar-banco-15.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'empresa_15.db');
console.log(`📁 Verificando banco: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

// Verificar tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }
    
    console.log('\n📋 TABELAS ENCONTRADAS:');
    if (rows.length === 0) {
        console.log('❌ Nenhuma tabela encontrada! O banco está vazio.');
    } else {
        rows.forEach(row => {
            console.log(`   ✅ ${row.name}`);
        });
    }
    
    // Verificar se tem dados nas tabelas principais
    console.log('\n📊 VERIFICANDO DADOS:');
    
    db.get('SELECT COUNT(*) as total FROM clientes', (err, row) => {
        console.log(`   Clientes: ${row ? row.total : 0}`);
    });
    
    db.get('SELECT COUNT(*) as total FROM servicos', (err, row) => {
        console.log(`   Serviços: ${row ? row.total : 0}`);
    });
    
    db.get('SELECT COUNT(*) as total FROM profissionais', (err, row) => {
        console.log(`   Profissionais: ${row ? row.total : 0}`);
    });
    
    db.get('SELECT COUNT(*) as total FROM horarios_funcionamento', (err, row) => {
        console.log(`   Horários: ${row ? row.total : 0}`);
        db.close();
    });
});