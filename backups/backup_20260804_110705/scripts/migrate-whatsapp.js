const path = require('path');
const fs = require('fs');

// Detecta automaticamente qual banco usar
let db;
try {
    // Tenta better-sqlite3 primeiro
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'database', 'barbearia.db');
    db = new Database(dbPath);
    console.log('📁 Usando better-sqlite3');
    console.log('📁 Banco:', dbPath);

    // Executa migrações
    const alteracoes = [
        'ALTER TABLE empresas ADD COLUMN whatsapp_instance VARCHAR(100)',
        'ALTER TABLE empresas ADD COLUMN whatsapp_connected BOOLEAN DEFAULT 0',
        'ALTER TABLE empresas ADD COLUMN whatsapp_number VARCHAR(20)',
        'ALTER TABLE empresas ADD COLUMN whatsapp_connected_at TIMESTAMP'
    ];

    alteracoes.forEach((sql, index) => {
        try {
            db.exec(sql);
            console.log(`✅ Migração ${index + 1} executada`);
        } catch (error) {
            if (error.message.includes('duplicate column')) {
                console.log(`⚠️  Coluna já existe (pode ignorar)`);
            } else {
                console.error(`❌ Erro na migração ${index + 1}:`, error.message);
            }
        }
    });

    db.close();
    console.log('\n✨ Migração concluída!');

} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('❌ better-sqlite3 não está instalado!');
        console.error('💡 Execute: npm install better-sqlite3');
        process.exit(1);
    }
    throw error;
}