// resetar-banco.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔄 Resetando banco...');

// Recriar tabelas
db.serialize(() => {
    db.run('DROP TABLE IF EXISTS comissoes');
    db.run('DROP TABLE IF EXISTS agendamentos');
    db.run('DROP TABLE IF EXISTS clientes');
    db.run('DROP TABLE IF EXISTS servicos');
    db.run('DROP TABLE IF EXISTS usuarios');
    db.run('DROP TABLE IF EXISTS empresas');
    
    // Tabela empresas
    db.run(`CREATE TABLE empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        plano TEXT DEFAULT 'trial',
        trial_expira DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabela usuarios (dono e barbeiros)
    db.run(`CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        senha TEXT,
        role TEXT DEFAULT 'dono',
        empresa_id INTEGER,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);
    
    // Tabela clientes
    db.run(`CREATE TABLE clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        telefone TEXT,
        email TEXT,
        empresa_id INTEGER,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);
    
    // Tabela agendamentos
    db.run(`CREATE TABLE agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        data DATE,
        hora TIME,
        servico TEXT,
        valor REAL,
        status TEXT DEFAULT 'pendente',
        empresa_id INTEGER,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);
    
    console.log('✅ Tabelas recriadas');
    
    // Criar empresa padrão para teste
    const trialExpira = new Date();
    trialExpira.setDate(trialExpira.getDate() + 45);
    
    db.run(`INSERT INTO empresas (nome, plano, trial_expira) VALUES (?, ?, ?)`, 
        ['Barbearia Teste', 'trial', trialExpira.toISOString().split('T')[0]]);
    
    // Criar usuário dono padrão
    const senhaHash = bcrypt.hashSync('123456', 10);
    db.run(`INSERT INTO usuarios (nome, email, senha, role, empresa_id) VALUES (?, ?, ?, ?, ?)`,
        ['Admin Teste', 'admin@teste.com', senhaHash, 'dono', 1]);
    
    console.log('✅ Usuário criado: admin@teste.com / 123456');
    console.log('✅ Trial expira em 45 dias');
    
    db.close();
});
