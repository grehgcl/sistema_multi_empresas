const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/barbearia.db');

console.log('📝 Adicionando coluna whatsapp_proprio_habilitado...');

db.serialize(() => {
    db.run('ALTER TABLE empresas ADD COLUMN whatsapp_proprio_habilitado INTEGER DEFAULT 0', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro:', err.message);
        } else if (err) {
            console.log('✅ whatsapp_proprio_habilitado já existe');
        } else {
            console.log('✅ whatsapp_proprio_habilitado criada!');
        }
    });
    
    setTimeout(() => {
        db.all('PRAGMA table_info(empresas)', [], (err, cols) => {
            if (!err) {
                console.log('\n📋 Colunas da tabela empresas:');
                cols.forEach(c => console.log('   -', c.name, ':', c.type));
            }
            db.close();
        });
    }, 500);
});
