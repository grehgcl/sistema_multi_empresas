// criar-banco-15.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('database/barbearia.db');

// Verificar se empresa 15 existe
db.get('SELECT id, nome FROM empresas WHERE id = 15', (err, empresa) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    if (!empresa) {
        console.log('❌ Empresa 15 não encontrada!');
        db.close();
        return;
    }

    console.log(`✅ Empresa encontrada: ${empresa.id} - ${empresa.nome}`);

    const dbPath = path.join(__dirname, 'database', `empresa_${empresa.id}.db`);
    
    if (fs.existsSync(dbPath)) {
        console.log(`✅ Banco já existe: ${dbPath}`);
        db.close();
        return;
    }

    console.log(`📁 Criando banco: ${dbPath}`);
    const empresaDb = new sqlite3.Database(dbPath);

    // Criar todas as tabelas
    empresaDb.serialize(() => {
        // clientes
        empresaDb.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            empresa_id INTEGER,
            bloqueado_chatbot INTEGER DEFAULT 0,
            dias_bloqueio INTEGER DEFAULT 0,
            grupos TEXT DEFAULT '[]',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // servicos
        empresaDb.run(`CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            empresa_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // profissionais
        empresaDb.run(`CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            comissao_percent INTEGER DEFAULT 30,
            empresa_id INTEGER,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            telefone TEXT
        )`);

        // agendamentos
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
            empresa_id INTEGER,
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

        // despesas
        empresaDb.run(`CREATE TABLE IF NOT EXISTS despesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
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

        // horarios_funcionamento
        empresaDb.run(`CREATE TABLE IF NOT EXISTS horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '08:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00',
            intervalo_minutos INTEGER DEFAULT 30
        )`);

        // configuracoes
        empresaDb.run(`CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE,
            valor TEXT,
            payment_mode TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inserir horários padrão
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
                [empresa.id, d.dia, d.aberto, 
                 d.aberto === 1 ? '08:00' : '00:00',
                 d.aberto === 1 ? '18:00' : '00:00',
                 d.aberto === 1 ? '12:00' : '00:00',
                 d.aberto === 1 ? '13:00' : '00:00',
                 30]
            );
        }

        console.log(`✅ Banco da empresa ${empresa.id} criado com sucesso!`);
        empresaDb.close();
        db.close();
    });
});