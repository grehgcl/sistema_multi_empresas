// criar-empresa-15.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('database/barbearia.db');

console.log('🔍 Verificando usuário com empresa_id 15...');

// 1. Buscar o usuário
db.get('SELECT id, nome, email, empresa_id FROM usuarios WHERE empresa_id = 15', (err, usuario) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    if (!usuario) {
        console.log('❌ Nenhum usuário com empresa_id 15 encontrado!');
        db.close();
        return;
    }

    console.log(`✅ Usuário encontrado: ${usuario.nome} (${usuario.email})`);

    // 2. Verificar se a empresa 15 já existe
    db.get('SELECT id FROM empresas WHERE id = 15', (err, empresa) => {
        if (err) {
            console.error('❌ Erro:', err);
            db.close();
            return;
        }

        if (empresa) {
            console.log('✅ Empresa 15 já existe!');
            db.close();
            return;
        }

        console.log('📝 Criando empresa 15...');

        // 3. Criar a empresa 15
        const sqlEmpresa = `
            INSERT INTO empresas (id, nome, plano, limite_profissionais, trial_expira, telefone_dono, whatsapp_proprio_habilitado) 
            VALUES (15, 'Salão da Sandra 2', 'trial', 1, datetime('now', '+45 days'), '55999999999', 0)
        `;

        db.run(sqlEmpresa, function(err) {
            if (err) {
                console.error('❌ Erro ao criar empresa 15:', err);
                db.close();
                return;
            }

            console.log('✅ Empresa 15 criada com sucesso!');

            // 4. Atualizar o usuário para garantir
            db.run('UPDATE usuarios SET empresa_id = 15 WHERE empresa_id = 15', function(err) {
                if (err) {
                    console.error('❌ Erro ao atualizar usuário:', err);
                    db.close();
                    return;
                }

                console.log('✅ Usuário atualizado com empresa_id 15');

                // 5. Criar o banco individual
                const dbPath = path.join(__dirname, 'database', 'empresa_15.db');
                
                if (fs.existsSync(dbPath)) {
                    console.log('✅ Banco empresa_15.db já existe');
                    db.close();
                    return;
                }

                console.log(`📁 Criando banco: ${dbPath}`);
                const empresaDb = new sqlite3.Database(dbPath);

                // Criar todas as tabelas
                empresaDb.serialize(() => {
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
                            [15, d.dia, d.aberto, 
                             d.aberto === 1 ? '08:00' : '00:00',
                             d.aberto === 1 ? '18:00' : '00:00',
                             d.aberto === 1 ? '12:00' : '00:00',
                             d.aberto === 1 ? '13:00' : '00:00',
                             30]
                        );
                    }

                    console.log('✅ Banco empresa_15.db criado com sucesso!');
                    empresaDb.close();
                    db.close();
                    console.log('\n🎉 Tudo pronto! Faça login novamente.');
                });
            });
        });
    });
});