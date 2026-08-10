// scripts/migrar-pg-para-sqlite.js
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuração do PostgreSQL
const pgPool = new Pool({
    connectionString: 'postgresql://postgres:XZqH3Xe00J7biJ7p4poWEF6Ah6hDWLjs@autorack.proxy.rlwy.net:55233/railway'
});

// Configuração do SQLite central
const centralDb = new sqlite3.Database(path.join(__dirname, '../database/central.db'));

async function migrar() {
    console.log('🔄 Migrando dados do PostgreSQL para SQLite...');

    try {
        // 1. Migrar empresas
        const empresas = await pgPool.query('SELECT * FROM empresas');
        console.log(`📋 ${empresas.rows.length} empresas encontradas`);

        for (const empresa of empresas.rows) {
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
                empresa.trial_expira, empresa.assinatura_ativa ? 1 : 0,
                empresa.assinatura_valida_ate, empresa.agendamentos_mes || 0,
                empresa.mes_referencia, empresa.dias_bloqueio_geral,
                empresa.telefone_dono, empresa.endereco,
                empresa.whatsapp_instance, empresa.whatsapp_connected ? 1 : 0,
                empresa.whatsapp_number, empresa.whatsapp_connected_at,
                empresa.whatsapp_proprio_habilitado ? 1 : 0, empresa.created_at
            ]);

            console.log(`  ✅ Empresa ${empresa.id} - ${empresa.nome}`);

            // 2. Migrar dados da empresa
            await migrarDadosEmpresa(empresa.id);
        }

        // 3. Migrar usuários
        const usuarios = await pgPool.query('SELECT * FROM usuarios');
        console.log(`📋 ${usuarios.rows.length} usuários encontrados`);

        for (const user of usuarios.rows) {
            centralDb.run(`
                INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, empresa_id, telefone, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [user.id, user.nome, user.email, user.senha, user.role, user.empresa_id, user.telefone, user.created_at]);
        }

        console.log('✅ Migração concluída!');

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pgPool.end();
        centralDb.close();
    }
}

async function migrarDadosEmpresa(empresaId) {
    const empresaDb = new sqlite3.Database(path.join(__dirname, `../database/empresa_${empresaId}.db`));

    // Criar tabelas
    criarTabelasEmpresa(empresaDb, empresaId);

    // Migrar clientes
    const clientes = await pgPool.query('SELECT * FROM clientes WHERE empresa_id = $1', [empresaId]);
    for (const c of clientes.rows) {
        empresaDb.run(`
            INSERT INTO clientes (id, nome, telefone, email, empresa_id, bloqueado_chatbot, dias_bloqueio, grupos, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [c.id, c.nome, c.telefone, c.email, c.empresa_id, c.bloqueado_chatbot || 0, c.dias_bloqueio, c.grupos || '[]', c.created_at]);
    }
    console.log(`    📊 ${clientes.rows.length} clientes migrados`);

    // Migrar profissionais
    const profissionais = await pgPool.query('SELECT * FROM profissionais WHERE empresa_id = $1', [empresaId]);
    for (const p of profissionais.rows) {
        empresaDb.run(`
            INSERT INTO profissionais (id, nome, email, senha, comissao_percent, empresa_id, ativo, telefone, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.nome, p.email, p.senha, p.comissao_percent, p.empresa_id, p.ativo || 1, p.telefone, p.created_at]);
    }
    console.log(`    📊 ${profissionais.rows.length} profissionais migrados`);

    // Migrar serviços
    const servicos = await pgPool.query('SELECT * FROM servicos WHERE empresa_id = $1', [empresaId]);
    for (const s of servicos.rows) {
        empresaDb.run(`
            INSERT INTO servicos (id, nome, descricao, valor, duracao, ativo, empresa_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [s.id, s.nome, s.descricao, s.valor, s.duracao, s.ativo || 1, s.empresa_id, s.created_at]);
    }
    console.log(`    📊 ${servicos.rows.length} serviços migrados`);

    // Migrar agendamentos
    const agendamentos = await pgPool.query('SELECT * FROM agendamentos WHERE empresa_id = $1', [empresaId]);
    for (const a of agendamentos.rows) {
        empresaDb.run(`
            INSERT INTO agendamentos (
                id, cliente_id, data, hora, servico_id, servico, valor, duracao,
                status, comissao, empresa_id, profissional_id, lembrete_enviado,
                valor_total, servicos_extras, valor_extras,
                forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            a.id, a.cliente_id, a.data, a.hora, a.servico_id, a.servico, a.valor, a.duracao,
            a.status, a.comissao, a.empresa_id, a.profissional_id, a.lembrete_enviado || 0,
            a.valor_total || 0, a.servicos_extras || '[]', a.valor_extras || 0,
            a.forma_pagamento || '', a.prazo_dias || 0, a.data_vencimento, a.descricao_pagamento || '',
            a.created_at
        ]);
    }
    console.log(`    📊 ${agendamentos.rows.length} agendamentos migrados`);

    // Migrar despesas
    const despesas = await pgPool.query('SELECT * FROM despesas WHERE empresa_id = $1', [empresaId]);
    for (const d of despesas.rows) {
        empresaDb.run(`
            INSERT INTO despesas (id, empresa_id, descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [d.id, d.empresa_id, d.descricao, d.categoria, d.valor, d.data, d.data_vencimento, d.pago || 0, d.forma_pagamento, d.observacao, d.created_at]);
    }
    console.log(`    📊 ${despesas.rows.length} despesas migradas`);

    empresaDb.close();
}

function criarTabelasEmpresa(db, empresaId) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, telefone TEXT, email TEXT,
            empresa_id INTEGER, bloqueado_chatbot INTEGER DEFAULT 0,
            dias_bloqueio TEXT, grupos TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, email TEXT, senha TEXT,
            comissao_percent REAL DEFAULT 0, empresa_id INTEGER,
            ativo INTEGER DEFAULT 1, telefone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, descricao TEXT,
            valor REAL DEFAULT 0, duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1, empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER, data TEXT NOT NULL, hora TEXT NOT NULL,
            servico_id INTEGER, servico TEXT, valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30, status TEXT DEFAULT 'agendado',
            comissao REAL DEFAULT 0, empresa_id INTEGER,
            profissional_id INTEGER, lembrete_enviado INTEGER DEFAULT 0,
            valor_total REAL DEFAULT 0, servicos_extras TEXT,
            valor_extras REAL DEFAULT 0,
            forma_pagamento TEXT DEFAULT '', prazo_dias INTEGER DEFAULT 0,
            data_vencimento TEXT, descricao_pagamento TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS despesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER, descricao TEXT, categoria TEXT,
            valor REAL DEFAULT 0, data TEXT, data_vencimento TEXT,
            pago INTEGER DEFAULT 0, forma_pagamento TEXT,
            observacao TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER, dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '08:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00'
        );
        CREATE TABLE IF NOT EXISTS lembretes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agendamento_id INTEGER, empresa_id INTEGER,
            cliente_id INTEGER, data_vencimento TEXT,
            forma_pagamento TEXT, prazo_dias INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

migrar();