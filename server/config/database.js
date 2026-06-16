// ============================================
// CONFIGURAÇÃO DO BANCO - NÃO MEXER!
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../database/barbearia.db'));

function initDatabase() {
    // TABELA: empresas
    db.run(`CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        plano TEXT DEFAULT 'trial',
        limite_profissionais INTEGER DEFAULT 1,
        trial_expira DATE,
        assinatura_ativa INTEGER DEFAULT 1,
        assinatura_valida_ate DATE,
        ultima_cobranca DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // TABELA: usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        role TEXT DEFAULT 'dono',
        empresa_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // TABELA: profissionais
    db.run(`CREATE TABLE IF NOT EXISTS profissionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        comissao_percent REAL DEFAULT 30,
        empresa_id INTEGER,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // TABELA: clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        email TEXT,
        bloqueado_chatbot INTEGER DEFAULT 0,
        empresa_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // TABELA: servicos
    db.run(`CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        valor REAL NOT NULL,
        duracao INTEGER DEFAULT 30,
        ativo INTEGER DEFAULT 1,
        empresa_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // TABELA: agendamentos
    db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        servico_id INTEGER,
        servico TEXT,
        valor REAL,
        data DATE NOT NULL,
        hora TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        comissao REAL DEFAULT 0,
        empresa_id INTEGER,
        profissional_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (servico_id) REFERENCES servicos(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
    )`);

    // TABELA: horarios_funcionamento
    db.run(`CREATE TABLE IF NOT EXISTS horarios_funcionamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        dia_semana INTEGER,
        aberto INTEGER DEFAULT 1,
        hora_inicio TEXT DEFAULT '09:00',
        hora_fim TEXT DEFAULT '18:00',
        almoco_inicio TEXT DEFAULT '12:00',
        almoco_fim TEXT DEFAULT '13:00',
        intervalo_minutos INTEGER DEFAULT 30,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // TABELA: transacoes_pagamento
    db.run(`CREATE TABLE IF NOT EXISTS transacoes_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        plano_id VARCHAR(50) NOT NULL,
        plano_nome VARCHAR(100) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        metodo VARCHAR(50) NOT NULL,
        transacao_id VARCHAR(255),
        pagamento_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        qr_code TEXT,
        qr_code_base64 TEXT,
        boleto_url TEXT,
        payment_method VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);

    // TABELA: planos_historico
    db.run(`CREATE TABLE IF NOT EXISTS planos_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        plano_antigo VARCHAR(50),
        plano_novo VARCHAR(50) NOT NULL,
        valor_pago DECIMAL(10,2),
        metodo_pagamento VARCHAR(50),
        comprovante TEXT,
        data_mudanca DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`);
}

function inserirHorariosPadrao(empresaId) {
    for (let i = 1; i <= 6; i++) {
        db.run(`INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
                VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00')`, [empresaId, i]);
    }
    db.run(`INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
            VALUES (?, 0, 0, '09:00', '18:00', '12:00', '13:00')`, [empresaId]);
}

module.exports = { db, initDatabase, inserirHorariosPadrao };