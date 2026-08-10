// scripts/criar-horarios-completo.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const EMPRESA_ID = 14;

function criarHorariosNoBanco(dbPath, nomeBanco) {
    return new Promise((resolve, reject) => {
        console.log(`\n📁 Processando: ${nomeBanco}`);

        const db = new sqlite3.Database(dbPath);

        // Primeiro, verificar se a tabela existe e qual a estrutura
        db.all("PRAGMA table_info('horarios_funcionamento')", (err, columns) => {
            if (err) {
                console.log(`   ⚠️ Tabela não existe, criando...`);
                criarTabela(db, dbPath, nomeBanco, resolve, reject);
                return;
            }

            const colunas = columns.map(c => c.name);
            console.log(`   📋 Colunas existentes: ${colunas.join(', ')}`);

            // Verificar se precisa recriar (se não tiver intervalo_minutos)
            if (!colunas.includes('intervalo_minutos')) {
                console.log(`   🔄 Recriando tabela com intervalo_minutos...`);
                db.exec(`
                    DROP TABLE IF EXISTS horarios_funcionamento;
                    CREATE TABLE horarios_funcionamento (
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
                        console.error(`   ❌ Erro ao recriar tabela:`, err.message);
                        db.close();
                        reject(err);
                        return;
                    }
                    console.log(`   ✅ Tabela recriada com intervalo_minutos`);
                    inserirHorarios(db, dbPath, nomeBanco, resolve, reject);
                });
            } else {
                // Tabela já existe com a coluna correta
                console.log(`   ✅ Tabela já existe com estrutura correta`);
                inserirHorarios(db, dbPath, nomeBanco, resolve, reject);
            }
        });
    });
}

function criarTabela(db, dbPath, nomeBanco, resolve, reject) {
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
            console.error(`   ❌ Erro ao criar tabela:`, err.message);
            db.close();
            reject(err);
            return;
        }
        console.log(`   ✅ Tabela criada`);
        inserirHorarios(db, dbPath, nomeBanco, resolve, reject);
    });
}

function inserirHorarios(db, dbPath, nomeBanco, resolve, reject) {
    // Primeiro, remover horários antigos da empresa
    db.run('DELETE FROM horarios_funcionamento WHERE empresa_id = ?', [EMPRESA_ID], (err) => {
        if (err) {
            console.error(`   ⚠️ Erro ao limpar horários antigos:`, err.message);
        }

        // Inserir horários
        db.run(`
            INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
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
                console.error(`   ❌ Erro ao inserir horários:`, err.message);
                db.close();
                reject(err);
                return;
            }
            console.log(`   ✅ ${this.changes} horários inseridos`);

            // Verificar
            db.all('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana', [EMPRESA_ID], (err, rows) => {
                if (err) {
                    console.error(`   ❌ Erro ao buscar horários:`, err.message);
                    db.close();
                    resolve();
                    return;
                }

                const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                console.log(`   📋 Horários para empresa ${EMPRESA_ID}:`);
                rows.forEach(r => {
                    const dia = dias[r.dia_semana] || r.dia_semana;
                    const status = r.aberto ? '🟢 Aberto' : '🔴 Fechado';
                    console.log(`      ${dia}: ${status} - ${r.hora_inicio} às ${r.hora_fim}`);
                });

                db.close();
                resolve();
            });
        });
    });
}

// ============================================
// EXECUTAR
// ============================================
async function main() {
    console.log('🚀 CRIANDO HORÁRIOS PARA EMPRESA 14...\n');

    const bancos = [
        { path: path.join(__dirname, '../database/barbearia.db'), nome: 'barbearia.db (principal)' },
        { path: path.join(__dirname, '../database/empresa_14.db'), nome: 'empresa_14.db' }
    ];

    for (const banco of bancos) {
        await criarHorariosNoBanco(banco.path, banco.nome);
    }

    console.log('\n✅ TODOS OS HORÁRIOS CRIADOS COM SUCESSO!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);