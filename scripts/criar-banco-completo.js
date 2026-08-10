const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Garantir que a pasta database existe
if (!fs.existsSync('database')) {
    fs.mkdirSync('database');
}

console.log('🔧 Criando banco de dados completo...');

// ============================================
// 1. CRIAR BANCO CENTRAL
// ============================================
const centralDb = new sqlite3.Database('database/central.db');

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
`, (err) => {
    if (err) {
        console.error('❌ Erro ao criar tabelas central:', err);
        process.exit(1);
    }
    console.log('✅ Banco central criado');

    // ============================================
    // 2. CRIAR EMPRESA 14
    // ============================================
    centralDb.run(`
        INSERT OR IGNORE INTO empresas (id, nome, plano, limite_profissionais, trial_expira)
        VALUES (14, 'Salão da Sandra', 'trial', 1, datetime('now', '+45 days'))
    `, function (err) {
        if (err) {
            console.error('❌ Erro ao criar empresa:', err);
            process.exit(1);
        }
        console.log('✅ Empresa 14 criada');

        // ============================================
        // 3. CRIAR USUÁRIO SANDRA
        // ============================================
        const senhaHash = bcrypt.hashSync('123456', 10);
        centralDb.run(`
            INSERT OR IGNORE INTO usuarios (nome, email, senha, role, empresa_id)
            VALUES ('Sandra', 'luziasandraleal@hotmail.com', ?, 'dono', 14)
        `, [senhaHash], function (err) {
            if (err) {
                console.error('❌ Erro ao criar usuário:', err);
                process.exit(1);
            }
            console.log('✅ Usuário Sandra criado');
            console.log('📧 luziasandraleal@hotmail.com');
            console.log('🔑 123456');

            // ============================================
            // 4. CRIAR BANCO DA EMPRESA 14
            // ============================================
            const empresaDb = new sqlite3.Database('database/empresa_14.db');

            empresaDb.exec(`
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
            `, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabelas empresa:', err);
                    process.exit(1);
                }
                console.log('✅ Banco empresa_14.db criado com todas as tabelas');

                // Inserir horários padrão
                empresaDb.exec(`
                    INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim)
                    VALUES 
                        (14, 1, 1, '08:00', '18:00'),
                        (14, 2, 1, '08:00', '18:00'),
                        (14, 3, 1, '08:00', '18:00'),
                        (14, 4, 1, '08:00', '18:00'),
                        (14, 5, 1, '08:00', '18:00'),
                        (14, 6, 1, '08:00', '18:00');
                `, (err) => {
                    if (err) {
                        console.error('❌ Erro ao inserir horários:', err);
                    } else {
                        console.log('✅ Horários padrão inseridos');
                    }

                    console.log('\n🎉 TUDO PRONTO!');
                    console.log('📁 Bancos criados:');
                    console.log('   - database/central.db');
                    console.log('   - database/empresa_14.db');
                    console.log('\n👤 Usuário: luziasandraleal@hotmail.com');
                    console.log('🔑 Senha: 123456');

                    centralDb.close();
                    empresaDb.close();
                });
            });
        });
    });
});