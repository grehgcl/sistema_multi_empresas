// scripts/forcar-coluna-intervalo.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function corrigirBanco(dbPath, nomeArquivo) {
    return new Promise((resolve) => {
        console.log(`🔧 Corrigindo: ${nomeArquivo}`);
        const db = new sqlite3.Database(dbPath);

        // 1. Verificar se a tabela existe
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='horarios_funcionamento'", (err, tableExists) => {
            if (err) {
                console.log(`   ❌ Erro ao verificar tabela: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            if (!tableExists) {
                console.log(`   ⚠️ Tabela horarios_funcionamento não existe, criando...`);
                // Buscar empresa_id
                db.get('SELECT id FROM empresas LIMIT 1', (err, row) => {
                    const empresaId = row?.id || 0;
                    db.exec(`
                        CREATE TABLE horarios_funcionamento (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            empresa_id INTEGER,
                            dia_semana INTEGER,
                            aberto INTEGER DEFAULT 1,
                            hora_inicio TEXT DEFAULT '08:00',
                            hora_fim TEXT DEFAULT '18:00',
                            almoco_inicio TEXT DEFAULT '12:00',
                            almoco_fim TEXT DEFAULT '13:00',
                            intervalo_minutos INTEGER DEFAULT 30,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                        INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                        VALUES 
                            (${empresaId}, 1, 1, '08:00', '18:00', '12:00', '13:00', 30),
                            (${empresaId}, 2, 1, '08:00', '18:00', '12:00', '13:00', 30),
                            (${empresaId}, 3, 1, '08:00', '18:00', '12:00', '13:00', 30),
                            (${empresaId}, 4, 1, '08:00', '18:00', '12:00', '13:00', 30),
                            (${empresaId}, 5, 1, '08:00', '18:00', '12:00', '13:00', 30),
                            (${empresaId}, 6, 1, '08:00', '18:00', '12:00', '13:00', 30),
                            (${empresaId}, 7, 0, '08:00', '18:00', '12:00', '13:00', 30);
                    `, (err) => {
                        if (err) {
                            console.log(`   ❌ Erro ao criar tabela: ${err.message}`);
                        } else {
                            console.log(`   ✅ Tabela criada com horários padrão`);
                        }
                        db.close();
                        resolve();
                    });
                });
                return;
            }

            // 2. Verificar as colunas
            db.all("PRAGMA table_info('horarios_funcionamento')", (err, columns) => {
                if (err) {
                    console.log(`   ❌ Erro ao verificar colunas: ${err.message}`);
                    db.close();
                    resolve();
                    return;
                }

                const colunas = columns.map(c => c.name);
                console.log(`   📋 Colunas: ${colunas.join(', ')}`);

                // 3. Adicionar colunas faltantes
                let colunasAdicionadas = 0;
                const colunasParaAdicionar = [
                    { nome: 'almoco_inicio', tipo: "TEXT DEFAULT '12:00'" },
                    { nome: 'almoco_fim', tipo: "TEXT DEFAULT '13:00'" },
                    { nome: 'intervalo_minutos', tipo: 'INTEGER DEFAULT 30' },
                    { nome: 'created_at', tipo: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
                    { nome: 'updated_at', tipo: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
                ];

                colunasParaAdicionar.forEach(col => {
                    if (!colunas.includes(col.nome)) {
                        db.run(`ALTER TABLE horarios_funcionamento ADD COLUMN ${col.nome} ${col.tipo}`, (err) => {
                            if (err) {
                                console.log(`   ⚠️ Erro ao adicionar ${col.nome}: ${err.message}`);
                            } else {
                                console.log(`   ✅ Coluna ${col.nome} adicionada`);
                                colunasAdicionadas++;
                            }
                        });
                    }
                });

                // 4. Aguardar um pouco para as colunas serem adicionadas
                setTimeout(() => {
                    // 5. Atualizar valores nulos
                    db.run(`
                        UPDATE horarios_funcionamento 
                        SET intervalo_minutos = COALESCE(intervalo_minutos, 30),
                            almoco_inicio = COALESCE(almoco_inicio, '12:00'),
                            almoco_fim = COALESCE(almoco_fim, '13:00')
                        WHERE intervalo_minutos IS NULL OR almoco_inicio IS NULL OR almoco_fim IS NULL
                    `, function (err) {
                        if (err) {
                            console.log(`   ❌ Erro ao atualizar: ${err.message}`);
                        } else {
                            console.log(`   ✅ ${this.changes || 0} registros atualizados`);
                        }

                        // 6. Verificar se Domingo existe
                        db.get('SELECT id FROM horarios_funcionamento WHERE dia_semana = 0', (err, row) => {
                            if (err) {
                                console.log(`   ❌ Erro: ${err.message}`);
                                db.close();
                                resolve();
                                return;
                            }

                            if (!row) {
                                // Buscar empresa_id
                                db.get('SELECT empresa_id FROM horarios_funcionamento LIMIT 1', (err, empresaRow) => {
                                    const empresaId = empresaRow?.empresa_id || 0;
                                    db.run(`
                                        INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                                        VALUES (?, 0, 0, '08:00', '18:00', '12:00', '13:00', 30)
                                    `, [empresaId], function (err) {
                                        if (err) {
                                            console.log(`   ❌ Erro ao criar Domingo: ${err.message}`);
                                        } else {
                                            console.log(`   ✅ Domingo criado`);
                                        }
                                        db.close();
                                        resolve();
                                    });
                                });
                            } else {
                                db.close();
                                resolve();
                            }
                        });
                    });
                }, 500);
            });
        });
    });
}

async function main() {
    console.log('🚀 FORÇANDO COLUNA INTERVALO_MINUTOS EM TODAS AS EMPRESAS...\n');

    const databaseDir = path.join(__dirname, '../database');
    if (!fs.existsSync(databaseDir)) {
        console.log('❌ Pasta database não encontrada');
        return;
    }

    const files = fs.readdirSync(databaseDir).filter(f => f.startsWith('empresa_') && f.endsWith('.db'));

    if (files.length === 0) {
        console.log('⚠️ Nenhum banco de empresa encontrado');
        return;
    }

    console.log(`📋 ${files.length} bancos de empresa encontrados\n`);

    let processados = 0;
    for (const file of files) {
        const dbPath = path.join(databaseDir, file);
        await corrigirBanco(dbPath, file);
        processados++;
        console.log('');
    }

    console.log(`✅ ${processados} bancos processados!`);
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);