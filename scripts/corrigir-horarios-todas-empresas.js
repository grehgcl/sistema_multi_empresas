// scripts/corrigir-horarios-todas-empresas.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function corrigirHorariosEmpresa(dbPath, empresaId) {
    return new Promise((resolve) => {
        console.log(`🔧 Corrigindo empresa ${empresaId}...`);
        const db = new sqlite3.Database(dbPath);

        // 1. Adicionar colunas faltantes
        db.exec(`
            ALTER TABLE horarios_funcionamento ADD COLUMN almoco_inicio TEXT DEFAULT '12:00';
            ALTER TABLE horarios_funcionamento ADD COLUMN almoco_fim TEXT DEFAULT '13:00';
            ALTER TABLE horarios_funcionamento ADD COLUMN intervalo_minutos INTEGER DEFAULT 30;
            ALTER TABLE horarios_funcionamento ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE horarios_funcionamento ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
        `, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`   ⚠️ Colunas já existem`);
                } else {
                    console.log(`   ❌ Erro: ${err.message}`);
                }
            } else {
                console.log(`   ✅ Colunas adicionadas`);
            }

            // 2. Atualizar horários com valores padrão
            db.run(`
                UPDATE horarios_funcionamento 
                SET almoco_inicio = COALESCE(almoco_inicio, '12:00'),
                    almoco_fim = COALESCE(almoco_fim, '13:00'),
                    intervalo_minutos = COALESCE(intervalo_minutos, 30)
                WHERE almoco_inicio IS NULL OR almoco_fim IS NULL OR intervalo_minutos IS NULL
            `, function (err) {
                if (err) {
                    console.log(`   ❌ Erro ao atualizar: ${err.message}`);
                } else {
                    console.log(`   ✅ ${this.changes} horários atualizados`);
                }

                // 3. Verificar se Domingo existe
                db.get('SELECT id FROM horarios_funcionamento WHERE dia_semana = 0', (err, row) => {
                    if (err) {
                        console.log(`   ❌ Erro: ${err.message}`);
                        db.close();
                        resolve();
                        return;
                    }

                    if (!row) {
                        console.log(`   📝 Criando Domingo...`);
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
                    } else {
                        db.close();
                        resolve();
                    }
                });
            });
        });
    });
}

async function main() {
    console.log('🚀 CORRIGINDO HORÁRIOS DE TODAS AS EMPRESAS...\n');

    const databaseDir = path.join(__dirname, '../database');
    const files = fs.readdirSync(databaseDir).filter(f => f.startsWith('empresa_') && f.endsWith('.db'));

    console.log(`📋 ${files.length} bancos de empresa encontrados\n`);

    for (const file of files) {
        // Extrair empresa_id do nome do arquivo
        const match = file.match(/empresa_(\d+)/);
        if (match) {
            const empresaId = parseInt(match[1]);
            const dbPath = path.join(databaseDir, file);
            await corrigirHorariosEmpresa(dbPath, empresaId);
        }
    }

    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);