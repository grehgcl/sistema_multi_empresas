// scripts/criar-sqlite-por-empresa-local.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔄 Criando SQLite por empresa a partir do banco local...');

// Banco original
const oldDbPath = path.join(__dirname, '../database/barbearia.db');

// Verificar se o banco existe
if (!fs.existsSync(oldDbPath)) {
    console.error('❌ Banco barbearia.db não encontrado!');
    console.log('📌 Se você tem dados no PostgreSQL, vamos precisar de uma abordagem diferente.');
    process.exit(1);
}

const oldDb = new sqlite3.Database(oldDbPath);

// Banco central
const centralDb = new sqlite3.Database(path.join(__dirname, '../database/central.db'));

// Criar tabelas do central
centralDb.exec(`
    CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        plano TEXT DEFAULT 'trial',
        limite_profissionais INTEGER DEFAULT 1,
        trial_expira DATETIME,
        assinatura_ativa INTEGER DEFAULT 0,
        assinatura_valida_ate DATETIME,
        agendamentos_mes INTEGER DEFAULT 0,
        mes_referencia TEXT,
        dias_bloqueio_geral TEXT,
        telefone_dono TEXT,
        endereco TEXT,
        whatsapp_instance TEXT,
        whatsapp_connected INTEGER DEFAULT 0,
        whatsapp_number TEXT,
        whatsapp_connected_at DATETIME,
        whatsapp_proprio_habilitado INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        role TEXT DEFAULT 'dono',
        empresa_id INTEGER,
        telefone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT UNIQUE NOT NULL,
        valor TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation');
`);

console.log('✅ Banco central criado');

// Buscar empresas do banco antigo
oldDb.all('SELECT * FROM empresas', (err, empresas) => {
    if (err) {
        console.error('❌ Erro ao buscar empresas:', err);
        process.exit(1);
    }

    console.log(`📋 ${empresas.length} empresas encontradas`);

    empresas.forEach(empresa => {
        console.log(`\n📁 Migrando empresa ${empresa.id} - ${empresa.nome}`);

        // Inserir no central
        centralDb.run(`
            INSERT OR REPLACE INTO empresas (
                id, nome, plano, limite_profissionais, trial_expira,
                assinatura_ativa, assinatura_valida_ate, agendamentos_mes, mes_referencia,
                dias_bloqueio_geral, telefone_dono, endereco,
                whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at,
                whatsapp_proprio_habilitado, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            empresa.id, empresa.nome, empresa.plano, empresa.limite_profissionais,
            empresa.trial_expira, empresa.assinatura_ativa || 0,
            empresa.assinatura_valida_ate, empresa.agendamentos_mes || 0,
            empresa.mes_referencia, empresa.dias_bloqueio_geral,
            empresa.telefone_dono, empresa.endereco,
            empresa.whatsapp_instance, empresa.whatsapp_connected || 0,
            empresa.whatsapp_number, empresa.whatsapp_connected_at,
            empresa.whatsapp_proprio_habilitado || 0, empresa.created_at
        ]);

        // Criar banco da empresa
        const empresaDbPath = path.join(__dirname, `../database/empresa_${empresa.id}.db`);
        const empresaDb = new sqlite3.Database(empresaDbPath);

        // Criar tabelas da empresa
        criarTabelasEmpresa(empresaDb, empresa.id);

        // Migrar dados
        migrarDadosEmpresa(oldDb, empresaDb, empresa.id);
    });

    // Migrar usuários
    console.log('\n📋 Migrando usuários...');
    oldDb.all('SELECT * FROM usuarios', (err, usuarios) => {
        if (err) {
            console.error('❌ Erro ao buscar usuários:', err);
            return;
        }

        usuarios.forEach(user => {
            centralDb.run(`
                INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, empresa_id, telefone, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [user.id, user.nome, user.email, user.senha, user.role, user.empresa_id, user.telefone, user.created_at]);
        });

        console.log(`✅ ${usuarios.length} usuários migrados`);
        console.log('\n🎉 MIGRAÇÃO CONCLUÍDA!');
        console.log(`📁 Bancos criados em: ${path.join(__dirname, '../database/')}`);

        oldDb.close();
        centralDb.close();
    });
});

function criarTabelasEmpresa(db, empresaId) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            empresa_id INTEGER,
            bloqueado_chatbot INTEGER DEFAULT 0,
            dias_bloqueio TEXT,
            grupos TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT,
            senha TEXT,
            comissao_percent REAL DEFAULT 0,
            empresa_id INTEGER,
            ativo INTEGER DEFAULT 1,
            telefone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            data TEXT NOT NULL,
            hora TEXT NOT NULL,
            servico_id INTEGER,
            servico TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            status TEXT DEFAULT 'agendado',
            comissao REAL DEFAULT 0,
            empresa_id INTEGER,
            profissional_id INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            valor_total REAL DEFAULT 0,
            servicos_extras TEXT,
            valor_extras REAL DEFAULT 0,
            forma_pagamento TEXT DEFAULT '',
            prazo_dias INTEGER DEFAULT 0,
            data_vencimento TEXT,
            descricao_pagamento TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS despesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            descricao TEXT,
            categoria TEXT,
            valor REAL DEFAULT 0,
            data TEXT,
            data_vencimento TEXT,
            pago INTEGER DEFAULT 0,
            forma_pagamento TEXT,
            observacao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '08:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00'
        );

        CREATE TABLE IF NOT EXISTS lembretes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agendamento_id INTEGER,
            empresa_id INTEGER,
            cliente_id INTEGER,
            data_vencimento TEXT,
            forma_pagamento TEXT,
            prazo_dias INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Horários padrão
    db.exec(`
        INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim)
        VALUES 
            (${empresaId}, 1, 1, '08:00', '18:00'),
            (${empresaId}, 2, 1, '08:00', '18:00'),
            (${empresaId}, 3, 1, '08:00', '18:00'),
            (${empresaId}, 4, 1, '08:00', '18:00'),
            (${empresaId}, 5, 1, '08:00', '18:00'),
            (${empresaId}, 6, 1, '08:00', '18:00');
    `);
}

function migrarDadosEmpresa(oldDb, newDb, empresaId) {
    // Clientes
    oldDb.all('SELECT * FROM clientes WHERE empresa_id = ?', [empresaId], (err, clientes) => {
        if (err) return console.error('Erro clientes:', err);
        if (clientes.length === 0) return;

        const stmt = newDb.prepare(`
            INSERT INTO clientes (id, nome, telefone, email, empresa_id, bloqueado_chatbot, dias_bloqueio, grupos, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        clientes.forEach(c => {
            stmt.run(c.id, c.nome, c.telefone, c.email, c.empresa_id, c.bloqueado_chatbot || 0, c.dias_bloqueio, c.grupos || '[]', c.created_at);
        });
        stmt.finalize();
        console.log(`  ✅ ${clientes.length} clientes migrados`);
    });

    // Profissionais
    oldDb.all('SELECT * FROM profissionais WHERE empresa_id = ?', [empresaId], (err, profissionais) => {
        if (err) return console.error('Erro profissionais:', err);
        if (profissionais.length === 0) return;

        const stmt = newDb.prepare(`
            INSERT INTO profissionais (id, nome, email, senha, comissao_percent, empresa_id, ativo, telefone, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        profissionais.forEach(p => {
            stmt.run(p.id, p.nome, p.email, p.senha, p.comissao_percent, p.empresa_id, p.ativo || 1, p.telefone, p.created_at);
        });
        stmt.finalize();
        console.log(`  ✅ ${profissionais.length} profissionais migrados`);
    });

    // Serviços
    oldDb.all('SELECT * FROM servicos WHERE empresa_id = ?', [empresaId], (err, servicos) => {
        if (err) return console.error('Erro servicos:', err);
        if (servicos.length === 0) return;

        const stmt = newDb.prepare(`
            INSERT INTO servicos (id, nome, descricao, valor, duracao, ativo, empresa_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        servicos.forEach(s => {
            stmt.run(s.id, s.nome, s.descricao, s.valor, s.duracao, s.ativo || 1, s.empresa_id, s.created_at);
        });
        stmt.finalize();
        console.log(`  ✅ ${servicos.length} serviços migrados`);
    });

    // Agendamentos
    oldDb.all('SELECT * FROM agendamentos WHERE empresa_id = ?', [empresaId], (err, agendamentos) => {
        if (err) return console.error('Erro agendamentos:', err);
        if (agendamentos.length === 0) return;

        const stmt = newDb.prepare(`
            INSERT INTO agendamentos (
                id, cliente_id, data, hora, servico_id, servico, valor, duracao,
                status, comissao, empresa_id, profissional_id, lembrete_enviado,
                valor_total, servicos_extras, valor_extras,
                forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        agendamentos.forEach(a => {
            stmt.run(
                a.id, a.cliente_id, a.data, a.hora, a.servico_id, a.servico, a.valor, a.duracao,
                a.status, a.comissao, a.empresa_id, a.profissional_id, a.lembrete_enviado || 0,
                a.valor_total || 0, a.servicos_extras || '[]', a.valor_extras || 0,
                a.forma_pagamento || '', a.prazo_dias || 0, a.data_vencimento, a.descricao_pagamento || '',
                a.created_at
            );
        });
        stmt.finalize();
        console.log(`  ✅ ${agendamentos.length} agendamentos migrados`);
    });

    // Despesas
    oldDb.all('SELECT * FROM despesas WHERE empresa_id = ?', [empresaId], (err, despesas) => {
        if (err) return console.error('Erro despesas:', err);
        if (despesas.length === 0) return;

        const stmt = newDb.prepare(`
            INSERT INTO despesas (id, empresa_id, descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        despesas.forEach(d => {
            stmt.run(d.id, d.empresa_id, d.descricao, d.categoria, d.valor, d.data, d.data_vencimento, d.pago || 0, d.forma_pagamento, d.observacao, d.created_at);
        });
        stmt.finalize();
        console.log(`  ✅ ${despesas.length} despesas migradas`);
    });
}