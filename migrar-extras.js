const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/barbearia.db');

console.log('📝 Adicionando colunas extras...');

db.serialize(() => {
    db.run("ALTER TABLE agendamentos ADD COLUMN servicos_extras TEXT DEFAULT '[]'", (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro servicos_extras:', err.message);
        } else if (err) {
            console.log('✅ servicos_extras já existe');
        } else {
            console.log('✅ servicos_extras criada!');
        }
    });
    
    db.run('ALTER TABLE agendamentos ADD COLUMN valor_extras REAL DEFAULT 0', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro valor_extras:', err.message);
        } else if (err) {
            console.log('✅ valor_extras já existe');
        } else {
            console.log('✅ valor_extras criada!');
        }
    });
    
    db.run('ALTER TABLE agendamentos ADD COLUMN valor_total REAL DEFAULT 0', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro valor_total:', err.message);
        } else if (err) {
            console.log('✅ valor_total já existe');
        } else {
            console.log('✅ valor_total criada!');
        }
    });
    
    setTimeout(() => {
        db.all('PRAGMA table_info(agendamentos)', [], (err, cols) => {
            if (!err) {
                console.log('\n📋 Colunas da tabela agendamentos:');
                cols.forEach(c => console.log('   -', c.name, ':', c.type));
            }
            db.close();
        });
    }, 500);
});
