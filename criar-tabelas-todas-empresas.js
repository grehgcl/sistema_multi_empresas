// ============================================
// SCRIPT: criar-tabelas-todas-empresas.js
// Executar: node criar-tabelas-todas-empresas.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 CRIANDO TABELAS PARA TODAS AS EMPRESAS...');

const dbDir = path.join(__dirname, 'database');

// Listar todas as empresas
const files = fs.readdirSync(dbDir);
const empresas = [];

for (const file of files) {
    if (file.startsWith('empresa_') && file.endsWith('.db')) {
        const id = parseInt(file.replace('empresa_', '').replace('.db', ''));
        empresas.push(id);
    }
}

console.log(`📊 ${empresas.length} empresas encontradas`);

for (const empresaId of empresas) {
    const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);
    console.log(`\n🔧 Processando empresa ${empresaId}...`);

    const db = new sqlite3.Database(dbPath);

    // 1. CRIAR TABELA clientes
    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            empresa_id INTEGER,
            bloqueado_chatbot INTEGER DEFAULT 0,
            dias_bloqueio INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error(`   ❌ Erro ao criar clientes empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ clientes criada`);
        }
    });

    // 2. CRIAR TABELA servicos
    db.run(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            empresa_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error(`   ❌ Erro ao criar servicos empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ servicos criada`);
        }
    });

    // 3. CRIAR TABELA profissionais
    db.run(`
        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            comissao_percent INTEGER DEFAULT 30,
            empresa_id INTEGER,
            ativo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            telefone TEXT
        )
    `, (err) => {
        if (err) {
            console.error(`   ❌ Erro ao criar profissionais empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ profissionais criada`);
        }
    });

    // 4. CRIAR TABELA agendamentos
    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
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
        )
    `, (err) => {
        if (err) {
            console.error(`   ❌ Erro ao criar agendamentos empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ agendamentos criada`);
        }
    });

    // 5. CRIAR TABELA despesas
    db.run(`
        CREATE TABLE IF NOT EXISTS despesas (
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
        )
    `, (err) => {
        if (err) {
            console.error(`   ❌ Erro ao criar despesas empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ despesas criada`);
        }
    });

    // 6. CRIAR TABELA horarios_funcionamento
    db.run(`
        CREATE TABLE IF NOT EXISTS horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '08:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00',
            intervalo_minutos INTEGER DEFAULT 30
        )
    `, (err) => {
        if (err) {
            console.error(`   ❌ Erro ao criar horarios_funcionamento empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ horarios_funcionamento criada`);
            db.close();
        }
    });

    // Inserir horários padrão
    setTimeout(() => {
        const dias = [
            { dia: 0, aberto: 0 },
            { dia: 1, aberto: 1 },
            { dia: 2, aberto: 1 },
            { dia: 3, aberto: 1 },
            { dia: 4, aberto: 1 },
            { dia: 5, aberto: 1 },
            { dia: 6, aberto: 1 }
        ];

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO horarios_funcionamento 
            (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const d of dias) {
            stmt.run([
                empresaId,
                d.dia,
                d.aberto,
                d.aberto === 1 ? '08:00' : '00:00',
                d.aberto === 1 ? '18:00' : '00:00',
                d.aberto === 1 ? '12:00' : '00:00',
                d.aberto === 1 ? '13:00' : '00:00',
                30
            ]);
        }

        stmt.finalize();
        console.log(`   ✅ Horários padrão inseridos empresa ${empresaId}`);
    }, 500);
}

console.log('\n✅ TODAS AS EMPRESAS ATUALIZADAS!');