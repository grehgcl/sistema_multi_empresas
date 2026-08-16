// scripts/criar-horarios.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const EMPRESA_ID = 14;

// Função para criar tabela e inserir horários
function criarHorarios(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);

        db.exec(`
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
            );
        `, (err) => {
            if (err) {
                console.error(`❌ Erro ao criar tabela em ${dbPath}:`, err.message);
                db.close();
                reject(err);
                return;
            }
            console.log(`✅ Tabela criada em ${path.basename(dbPath)}`);

            // Inserir horários
            db.run(`
                INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                VALUES 
                    (?, 1, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (?, 2, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (?, 3, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (?, 4, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (?, 5, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (?, 6, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (?, 7, 0, '08:00', '18:00', '12:00', '13:00', 30)
            `, [EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID], function (err) {
                if (err) {
                    console.error(`❌ Erro ao inserir horários em ${dbPath}:`, err.message);
                    db.close();
                    reject(err);
                    return;
                }
                console.log(`✅ ${this.changes} horários inseridos em ${path.basename(dbPath)}`);

                // Verificar
                db.all('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana', [EMPRESA_ID], (err, rows) => {
                    if (err) {
                        console.error('❌ Erro ao buscar:', err.message);
                        db.close();
                        resolve();
                        return;
                    }
                    console.log(`📋 Horários em ${path.basename(dbPath)}:`);
                    rows.forEach(r => {
                        const status = r.aberto ? '🟢 Aberto' : '🔴 Fechado';
                        console.log(`   Dia ${r.dia_semana}: ${status} - ${r.hora_inicio} às ${r.hora_fim}`);
                    });
                    db.close();
                    resolve();
                });
            });
        });
    });
}

// ============================================
// EXECUTAR
// ============================================
async function main() {
    console.log('🔧 Criando horários para empresa 14...\n');

    // 1. Banco principal
    await criarHorarios(path.join(__dirname, '../database/barbearia.db'));
    console.log('');

    // 2. Banco da empresa
    await criarHorarios(path.join(__dirname, '../database/empresa_14.db'));
    console.log('');

    console.log('✅ TODOS OS HORÁRIOS CRIADOS!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);