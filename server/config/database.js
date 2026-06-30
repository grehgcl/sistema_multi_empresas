// ============================================
// CONFIGURAÇÃO DO BANCO DE DADOS HÍBRIDO
// ============================================

let sqlite3;
try {
    if (process.env.NODE_ENV !== 'production' && process.env.RENDER !== 'true') {
        sqlite3 = require('sqlite3').verbose();
        console.log('✅ sqlite3 carregado para desenvolvimento');
    } else {
        console.log('ℹ sqlite3 não carregado (ambiente de produção)');
        sqlite3 = null;
    }
} catch (e) {
    console.log('⚠ sqlite3 não disponível');
    sqlite3 = null;
}

const { Pool } = require('pg');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true';

let db;

if (isProduction || isRender) {
    console.log('🔵 Conectando ao PostgreSQL (Produção)...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    function convertPlaceholders(sql) {
        if (sql.includes('$1')) {
            return sql;
        }
        let i = 0;
        return sql.replace(/\?/g, () => `$${++i}`);
    }

    db = {
        get: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (typeof callback !== 'function') {
                callback = () => { };
            }
            if (!Array.isArray(params)) {
                params = [params];
            }

            const sqlFinal = sql.includes('?') ? convertPlaceholders(sql) : sql;

            console.log(`📝 GET SQL: ${sqlFinal.substring(0, 100)}...`);

            pool.query(sqlFinal, params, (err, result) => {
                if (err) {
                    console.error('❌ db.get error:', err.message);
                    console.error('❌ SQL:', sqlFinal);
                    console.error('❌ Params:', params);
                    return callback(err);
                }
                callback(null, result.rows[0] || null);
            });
        },

        all: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (typeof callback !== 'function') {
                callback = () => { };
            }
            if (!Array.isArray(params)) {
                params = [params];
            }

            const sqlFinal = sql.includes('?') ? convertPlaceholders(sql) : sql;

            console.log(`📝 ALL SQL: ${sqlFinal.substring(0, 100)}...`);

            pool.query(sqlFinal, params, (err, result) => {
                if (err) {
                    console.error('❌ db.all error:', err.message);
                    console.error('❌ SQL:', sqlFinal);
                    console.error('❌ Params:', params);
                    return callback(err);
                }
                callback(null, result.rows);
            });
        },

        run: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (typeof callback !== 'function') {
                callback = () => { };
            }
            if (!Array.isArray(params)) {
                params = [params];
            }

            const sqlFinal = sql.includes('?') ? convertPlaceholders(sql) : sql;

            console.log(`📝 RUN SQL: ${sqlFinal.substring(0, 100)}...`);

            pool.query(sqlFinal, params, (err, result) => {
                if (err) {
                    console.error('❌ db.run error:', err.message);
                    console.error('❌ SQL:', sqlFinal);
                    console.error('❌ Params:', params);
                    return callback(err);
                }
                const lastID = result.rows[0]?.id || null;
                callback(null, {
                    lastID: lastID,
                    id: lastID,
                    changes: result.rowCount,
                    rows: result.rows
                });
            });
        },

        pool: pool
    };

    pool.query('SELECT NOW()', (err) => {
        if (err) console.error('❌ Erro PostgreSQL:', err.message);
        else console.log('✅ PostgreSQL conectado!');
    });

} else {
    console.log('🟢 Conectando ao SQLite (Desenvolvimento)...');
    if (sqlite3) {
        const sqliteDb = new sqlite3.Database(path.join(__dirname, '../../database/barbearia.db'));

        db = {
            get: (sql, params, callback) => {
                if (typeof params === 'function') { callback = params; params = []; }
                if (typeof callback !== 'function') { callback = () => { }; }
                if (!Array.isArray(params)) { params = [params]; }
                return sqliteDb.get(sql, params, callback);
            },
            all: (sql, params, callback) => {
                if (typeof params === 'function') { callback = params; params = []; }
                if (typeof callback !== 'function') { callback = () => { }; }
                if (!Array.isArray(params)) { params = [params]; }
                return sqliteDb.all(sql, params, callback);
            },
            run: (sql, params, callback) => {
                if (typeof params === 'function') { callback = params; params = []; }
                if (typeof callback !== 'function') { callback = () => { }; }
                if (!Array.isArray(params)) { params = [params]; }
                return sqliteDb.run(sql, params, callback);
            },
            close: () => sqliteDb.close()
        };

        console.log('✅ SQLite conectado!');
    } else {
        console.error('❌ sqlite3 não disponível! Execute: npm install --include=dev');
        process.exit(1);
    }
}

// ============================================================
// FUNÇÃO: VERIFICAR E CRIAR COLUNA dias_bloqueio
// ============================================================
function verificarColunaDiasBloqueio() {
    console.log('🔍 Verificando coluna dias_bloqueio...');

    const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const sqlCheck = isProd
        ? `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'clientes' 
           AND column_name = 'dias_bloqueio'`
        : `PRAGMA table_info(clientes)`;

    db.all(sqlCheck, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao verificar coluna:', err.message);
            return;
        }

        const existe = rows && rows.length > 0;

        if (existe) {
            console.log('✅ Coluna dias_bloqueio já existe!');
            return;
        }

        console.log('📝 Criando coluna dias_bloqueio...');

        const sqlAdd = isProd
            ? `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_bloqueio INTEGER DEFAULT 1`
            : `ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1`;

        db.run(sqlAdd, [], (err) => {
            if (err) {
                console.error('❌ Erro ao criar coluna:', err.message);

                if (isProd) {
                    const sqlAdd2 = `ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1`;
                    db.run(sqlAdd2, [], (err2) => {
                        if (err2 && !err2.message.includes('already exists')) {
                            console.error('❌ Erro ao criar coluna (tentativa 2):', err2.message);
                        } else {
                            console.log('✅ Coluna dias_bloqueio criada com sucesso!');
                            atualizarClientes();
                        }
                    });
                }
                return;
            }

            console.log('✅ Coluna dias_bloqueio criada com sucesso!');
            atualizarClientes();
        });
    });
}

function atualizarClientes() {
    const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const sqlUpdate = isProd
        ? `UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL`
        : `UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL`;

    db.run(sqlUpdate, [], (err) => {
        if (err) {
            console.error('❌ Erro ao atualizar clientes:', err.message);
        } else {
            console.log('✅ Clientes atualizados com dias_bloqueio = 1');
        }
    });
}

// ============================================================
// CRIAÇÃO DE ÍNDICES PRA PERFORMANCE
// ============================================================
function criarIndices() {
    const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const indices = isProd ? [
        `CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_data ON agendamentos(empresa_id, data)`,
        `CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON agendamentos(profissional_id, data, hora) WHERE status = 'agendado'`,
        `CREATE INDEX IF NOT EXISTS idx_clientes_empresa_telefone ON clientes(empresa_id, telefone)`,
        `CREATE INDEX IF NOT EXISTS idx_horario_unico ON agendamentos(empresa_id, profissional_id, data, hora) WHERE status = 'agendado'`
    ] : [
        `CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_data ON agendamentos(empresa_id, data)`,
        `CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON agendamentos(profissional_id, data, hora) WHERE status = 'agendado'`,
        `CREATE INDEX IF NOT EXISTS idx_clientes_empresa_telefone ON clientes(empresa_id, telefone)`
    ];

    indices.forEach(sql => {
        db.run(sql, [], (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ Erro ao criar índice:', err.message);
            }
        });
    });
}

function initDatabase() {
    setTimeout(criarIndices, 1000);
}

function inserirHorariosPadrao(empresaId) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const diasSemana = [0, 1, 2, 3, 4, 5, 6];

    console.log(`📝 Inserindo horários padrão para empresa: ${empresaId} (${isProduction ? 'POSTGRESQL' : 'SQLITE'})`);

    for (const dia of diasSemana) {
        let sql;
        let params = [empresaId, dia, 1, '09:00', '18:00', '12:00', '13:00', 30];

        if (isProduction) {
            sql = `
                INSERT INTO horarios_funcionamento 
                (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (empresa_id, dia_semana) 
                DO UPDATE SET
                    aberto = EXCLUDED.aberto,
                    hora_inicio = EXCLUDED.hora_inicio,
                    hora_fim = EXCLUDED.hora_fim,
                    almoco_inicio = EXCLUDED.almoco_inicio,
                    almoco_fim = EXCLUDED.almoco_fim,
                    intervalo_minutos = EXCLUDED.intervalo_minutos
            `;
        } else {
            sql = `
                INSERT OR REPLACE INTO horarios_funcionamento 
                (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
        }

        db.run(sql, params, function (err) {
            if (err) {
                console.error(`❌ Erro ao inserir horário dia ${dia} (${isProduction ? 'PostgreSQL' : 'SQLite'}):`, err.message);
            } else {
                console.log(`✅ Horário dia ${dia} inserido/atualizado com sucesso`);
            }
        });
    }
}

// ============================================
// MIGRAÇÃO: Adicionar coluna telefone na tabela usuarios
// ============================================
function migrarTelefoneUsuarios() {
    console.log('🔍 Verificando coluna telefone em usuarios...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
        const sqlCheck = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'usuarios' 
            AND column_name = 'telefone'
        `;

        db.get(sqlCheck, [], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar telefone em usuarios:', err.message);
                return;
            }

            if (row) {
                console.log('✅ Coluna telefone já existe em usuarios!');
                return;
            }

            console.log('📝 Criando coluna telefone em usuarios (PostgreSQL)...');
            const sqlAdd = `ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(20)`;

            db.run(sqlAdd, [], (err) => {
                if (err) {
                    console.error('❌ Erro ao criar telefone em usuarios:', err.message);
                    return;
                }
                console.log('✅ Coluna telefone criada em usuarios!');
            });
        });
    } else {
        db.all("PRAGMA table_info(usuarios)", [], (err, columns) => {
            if (err) {
                console.error('❌ Erro ao listar colunas:', err.message);
                return;
            }

            const existe = columns.some(col => col.name === 'telefone');

            if (existe) {
                console.log('✅ Coluna telefone já existe em usuarios!');
                return;
            }

            console.log('📝 Criando coluna telefone em usuarios (SQLite)...');
            const sqlAdd = `ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(20)`;

            db.run(sqlAdd, [], (err) => {
                if (err) {
                    console.error('❌ Erro ao criar telefone em usuarios:', err.message);
                    return;
                }
                console.log('✅ Coluna telefone criada em usuarios!');
            });
        });
    }
}

// ============================================
// MIGRAÇÃO: Tabela de acessos
// ============================================
function migrarTabelaAcessos() {
    console.log('🔍 Verificando tabela acessos...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const sql = isProduction
        ? `CREATE TABLE IF NOT EXISTS acessos (
            id SERIAL PRIMARY KEY,
            empresa_id INTEGER NOT NULL,
            usuario_id INTEGER,
            data_acesso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip VARCHAR(45),
            user_agent TEXT,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`
        : `CREATE TABLE IF NOT EXISTS acessos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            usuario_id INTEGER,
            data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip VARCHAR(45),
            user_agent TEXT,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`;

    db.run(sql, [], (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela acessos:', err.message);
        } else {
            console.log('✅ Tabela acessos verificada/criada');
        }
    });
}

// ============================================
// 🔥 MIGRAÇÃO: Adicionar coluna duracao na tabela agendamentos
// ============================================
function migrarDuracaoAgendamentos() {
    console.log('🔍 Verificando coluna duracao em agendamentos...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
        const sqlCheck = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'agendamentos' 
            AND column_name = 'duracao'
        `;

        db.get(sqlCheck, [], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar duracao:', err.message);
                return;
            }

            if (row) {
                console.log('✅ Coluna duracao já existe em agendamentos!');
                return;
            }

            console.log('📝 Criando coluna duracao em agendamentos (PostgreSQL)...');
            const sqlAdd = `ALTER TABLE agendamentos ADD COLUMN duracao INTEGER DEFAULT 30`;

            db.run(sqlAdd, [], (err) => {
                if (err) {
                    console.error('❌ Erro ao criar duracao:', err.message);
                    return;
                }
                console.log('✅ Coluna duracao criada em agendamentos!');
            });
        });
    } else {
        db.all("PRAGMA table_info(agendamentos)", [], (err, columns) => {
            if (err) {
                console.error('❌ Erro ao listar colunas:', err.message);
                return;
            }

            const existe = columns.some(col => col.name === 'duracao');

            if (existe) {
                console.log('✅ Coluna duracao já existe em agendamentos!');
                return;
            }

            console.log('📝 Criando coluna duracao em agendamentos (SQLite)...');
            const sqlAdd = `ALTER TABLE agendamentos ADD COLUMN duracao INTEGER DEFAULT 30`;

            db.run(sqlAdd, [], (err) => {
                if (err) {
                    console.error('❌ Erro ao criar duracao:', err.message);
                    return;
                }
                console.log('✅ Coluna duracao criada em agendamentos!');
            });
        });
    }
}

// ============================================
// EXECUTAR MIGRAÇÕES
// ============================================
setTimeout(migrarTabelaAcessos, 1000);
setTimeout(migrarTelefoneUsuarios, 2000);
setTimeout(migrarDuracaoAgendamentos, 2500); // 🔥 NOVA MIGRAÇÃO

// ============================================================
// EXPORTAR FUNÇÕES
// ============================================================
module.exports = {
    db,
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio
};

console.log('✅ database.js carregado com migração de duracao!');