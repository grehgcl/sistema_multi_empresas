// recriar-banco-17.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const empresaId = 17;
const dbPath = path.join(__dirname, 'database', `empresa_${empresaId}.db`);

console.log(`📁 Recriando banco: empresa_${empresaId}.db`);

// Deletar o banco antigo
if (fs.existsSync(dbPath)) {
    console.log('🗑️ Deletando banco antigo...');
    fs.unlinkSync(dbPath);
}

const empresaDb = new sqlite3.Database(dbPath);

// Criar todas as tabelas
empresaDb.serialize(() => {
    console.log('📋 Criando tabelas...');

    empresaDb.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        email TEXT,
        empresa_id INTEGER DEFAULT ${empresaId},
        bloqueado_chatbot INTEGER DEFAULT 0,
        dias_bloqueio INTEGER DEFAULT 0,
        grupos TEXT DEFAULT '[]',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    empresaDb.run(`CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        valor REAL DEFAULT 0,
        duracao INTEGER DEFAULT 30,
        ativo INTEGER DEFAULT 1,
        empresa_id INTEGER DEFAULT ${empresaId},
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    empresaDb.run(`CREATE TABLE IF NOT EXISTS profissionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        comissao_percent INTEGER DEFAULT 30,
        empresa_id INTEGER DEFAULT ${empresaId},
        ativo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        telefone TEXT
    )`);

    empresaDb.run(`CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        data TEXT,
        hora TEXT,
        servico_id INTEGER,
        servico TEXT,
        valor REAL DEFAULT 0,
        duracao INTEGER DEFAULT 30,
        status TEXT DEFAULT 'pendente',
        comissao REAL DEFAULT 0,
        empresa_id INTEGER DEFAULT ${empresaId},
        profissional_id INTEGER,
        lembrete_enviado INTEGER DEFAULT 0,
        valor_total REAL DEFAULT 0,
        servicos_extras TEXT DEFAULT '[]',
        valor_extras REAL DEFAULT 0,
        forma_pagamento TEXT,
        prazo_dias INTEGER,
        data_vencimento TEXT,
        descricao_pagamento TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (servico_id) REFERENCES servicos(id),
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
    )`);

    empresaDb.run(`CREATE TABLE IF NOT EXISTS despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT ${empresaId},
        descricao TEXT NOT NULL,
        categoria TEXT,
        valor REAL DEFAULT 0,
        data TEXT,
        data_vencimento TEXT,
        pago INTEGER DEFAULT 0,
        forma_pagamento TEXT,
        observacao TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    empresaDb.run(`CREATE TABLE IF NOT EXISTS horarios_funcionamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER DEFAULT ${empresaId},
        dia_semana INTEGER,
        aberto INTEGER DEFAULT 1,
        hora_inicio TEXT DEFAULT '08:00',
        hora_fim TEXT DEFAULT '18:00',
        almoco_inicio TEXT DEFAULT '12:00',
        almoco_fim TEXT DEFAULT '13:00',
        intervalo_minutos INTEGER DEFAULT 30
    )`);

    empresaDb.run(`CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT UNIQUE,
        valor TEXT,
        payment_mode TEXT DEFAULT 'simulation',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('📋 Inserindo dados padrão...');

    // Horários
    const dias = [
        { dia: 0, aberto: 0 },
        { dia: 1, aberto: 1 },
        { dia: 2, aberto: 1 },
        { dia: 3, aberto: 1 },
        { dia: 4, aberto: 1 },
        { dia: 5, aberto: 1 },
        { dia: 6, aberto: 1 }
    ];

    for (const d of dias) {
        empresaDb.run(`INSERT OR IGNORE INTO horarios_funcionamento 
            (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [empresaId, d.dia, d.aberto, 
             d.aberto === 1 ? '08:00' : '00:00',
             d.aberto === 1 ? '18:00' : '00:00',
             d.aberto === 1 ? '12:00' : '00:00',
             d.aberto === 1 ? '13:00' : '00:00',
             30]
        );
    }

    // Configuração
    empresaDb.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation')`);

    // Serviço padrão
    empresaDb.run(`INSERT OR IGNORE INTO servicos (nome, descricao, valor, duracao, empresa_id) 
        VALUES ('Corte de Cabelo', 'Corte tradicional', 40.00, 30, ${empresaId})`);

    // Profissional padrão
    const senhaHash = bcrypt.hashSync('123456', 10);
    empresaDb.run(`INSERT OR IGNORE INTO profissionais (nome, email, senha, comissao_percent, empresa_id, telefone) 
        VALUES ('Profissional Padrão', 'profissional@empresa${empresaId}.com', ?, 30, ${empresaId}, '55999999999')`,
        [senhaHash]);

    console.log('✅ Banco empresa_17.db recriado com sucesso!');
    
    // Verificar
    setTimeout(() => {
        empresaDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err);
            } else {
                console.log('\n📋 Tabelas criadas:');
                rows.forEach(row => console.log(`   ✅ ${row.name}`));
            }
            empresaDb.close();
        });
    }, 500);
});