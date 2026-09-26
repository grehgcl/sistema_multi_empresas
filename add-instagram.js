const db = require('./server/config/database').db;
db.run('ALTER TABLE empresas ADD COLUMN instagram TEXT', (e) => {
    if (e) {
        if (e.message.includes('duplicate column')) {
            console.log('✅ Coluna instagram já existe');
        } else {
            console.log('❌ Erro:', e.message);
        }
    } else {
        console.log('✅ Coluna instagram adicionada');
    }
});