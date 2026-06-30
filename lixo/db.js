const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'barbearia.db'), (err) => {
    if (err) {
        console.error('Erro ao conectar banco:', err);
    } else {
        console.log('✅ Banco conectado');
        inicializarTabelas();
    }
});

function inicializarTabelas() {
    // Tabela de empresas
    db.run(`CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        plano TEXT DEFAULT 'gratuito',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de usuários/barbeiros
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        senha TEXT,
        role TEXT DEFAULT 'barbeiro',
        comissao_percentual REAL DEFAULT 30,
        empresa_id INTEGER,
        ativo INTEGER DEFAULT 1,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // Tabela de clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        telefone TEXT,
        email TEXT,
        empresa_id INTEGER,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // Tabela de serviços
    db.run(`CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        preco REAL,
        duracao INTEGER,
        empresa_id INTEGER,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // Tabela de agendamentos
    db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        barbeiro_id INTEGER,
        servico_id INTEGER,
        data DATE,
        hora TIME,
        valor_total REAL,
        status TEXT DEFAULT 'pendente',
        empresa_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (barbeiro_id) REFERENCES usuarios(id),
        FOREIGN KEY (servico_id) REFERENCES servicos(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // Tabela de comissões (A MAIS IMPORTANTE)
    db.run(`CREATE TABLE IF NOT EXISTS comissoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agendamento_id INTEGER,
        barbeiro_id INTEGER,
        valor REAL,
        data DATE,
        status TEXT DEFAULT 'pendente',
        pago_em DATE,
        empresa_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
        FOREIGN KEY (barbeiro_id) REFERENCES usuarios(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    console.log('✅ Tabelas criadas/verificadas');
}

module.exports = db;