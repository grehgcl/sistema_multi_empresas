const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database/barbearia.db');

db.serialize(() => {
    // Criar tabela profissionais
    db.run(`
        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            comissao_percent INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )
    `, (err) => {
        if (err) console.log('❌ Erro ao criar profissionais:', err.message);
        else console.log('✅ Tabela profissionais criada');
    });

    // Adicionar coluna profissional_id na tabela agendamentos
    db.run(`ALTER TABLE agendamentos ADD COLUMN profissional_id INTEGER REFERENCES profissionais(id)`, (err) => {
        if (err && err.message.includes('duplicate column name')) {
            console.log('⚠️ Coluna profissional_id já existe');
        } else if (err) {
            console.log('❌ Erro:', err.message);
        } else {
            console.log('✅ Coluna profissional_id adicionada em agendamentos');
        }
    });
});

setTimeout(() => {
    db.close();
    console.log('📁 Banco de dados atualizado!');
}, 500);