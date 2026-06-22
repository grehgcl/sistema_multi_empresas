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

    // WRAPPER UNIVERSAL: converte? em $1, $2... automático
    function convertPlaceholders(sql) {
        let i = 0;
        return sql.replace(/\?/g, () => `$${++i}`);
    }

    db = {
        get: (sql, params, callback) => {
            if (typeof params === 'function') { callback = params; params = []; }
            sql = convertPlaceholders(sql);
            pool.query(sql, params, (err, result) => {
                if (err) return callback(err);
                callback(null, result.rows[0] || null);
            });
        },
        all: (sql, params, callback) => {
            if (typeof params === 'function') { callback = params; params = []; }
            sql = convertPlaceholders(sql);
            pool.query(sql, params, (err, result) => {
                if (err) return callback(err);
                callback(null, result.rows);
            });
        },
        run: (sql, params, callback) => {
            if (typeof params === 'function') { callback = params; params = []; }
            sql = convertPlaceholders(sql);
            pool.query(sql, params, (err, result) => {
                if (err) return callback(err);
                const lastID = result.rows[0]?.id || null;
                callback(null, { lastID, id: lastID, changes: result.rowCount });
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
        db = sqliteDb;
        console.log('✅ SQLite conectado!');
    } else {
        console.error('❌ sqlite3 não disponível! Execute: npm install --include=dev');
        process.exit(1);
    }
}

// ============================================================
// CRIAÇÃO DE ÍNDICES PRA PERFORMANCE
// ============================================================
function criarIndices() {
    const indices = [
        `CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_data ON agendamentos(empresa_id, data)`,
        `CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON agendamentos(profissional_id, data, hora) WHERE status = 'agendado'`,
        `CREATE INDEX IF NOT EXISTS idx_clientes_empresa_telefone ON clientes(empresa_id, telefone)`,
        `CREATE INDEX IF NOT EXISTS idx_horario_unico ON agendamentos(empresa_id, profissional_id, data, hora) WHERE status = 'agendado'`
    ];

    indices.forEach(sql => {
        db.run(sql, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('❌ Erro ao criar índice:', err.message);
            }
        });
    });
}

function initDatabase() {
    //... seu código de criação de tabelas existente...

    // Depois de criar as tabelas, cria os índices
    setTimeout(criarIndices, 1000);
}

// server/config/database.js

function inserirHorariosPadrao(empresaId) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const diasSemana = [0, 1, 2, 3, 4, 5, 6];

    console.log(`📝 Inserindo horários padrão para empresa: ${empresaId} (${isProduction ? 'POSTGRESQL' : 'SQLITE'})`);

    // 🔥 PARA CADA DIA DA SEMANA
    for (const dia of diasSemana) {
        let sql;
        let params = [empresaId, dia, 1, '09:00', '18:00', '12:00', '13:00', 30];

        if (isProduction) {
            // ✅ POSTGRESQL: Usa ON CONFLICT com DO UPDATE
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
            // ✅ SQLITE: Usa INSERT OR REPLACE
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

module.exports = { db, initDatabase, inserirHorariosPadrao };