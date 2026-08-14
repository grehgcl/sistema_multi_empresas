// scripts/corrigir-horarios-empresa.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ============================================
// DADOS DA EMPRESA (EDITAR AQUI)
// ============================================
const EMPRESA_ID = 15; // ← Mude para o ID da empresa que quer corrigir

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
function corrigirHorarios(empresaId) {
    const dbPath = path.join(__dirname, `../database/empresa_${empresaId}_barbearia-do-ze.db`);

    // Tentar encontrar o banco com o nome correto
    const files = fs.readdirSync(path.join(__dirname, '../database'));
    const bancoEncontrado = files.find(f => f.startsWith(`empresa_${empresaId}`) && f.endsWith('.db'));

    if (!bancoEncontrado) {
        console.error(`❌ Banco da empresa ${empresaId} não encontrado`);
        return;
    }

    const dbPathFinal = path.join(__dirname, `../database/${bancoEncontrado}`);
    console.log(`📁 Banco encontrado: ${bancoEncontrado}`);

    const db = new sqlite3.Database(dbPathFinal);

    // 1. Adicionar coluna intervalo_minutos
    db.exec(`
        ALTER TABLE horarios_funcionamento ADD COLUMN intervalo_minutos INTEGER DEFAULT 30;
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Coluna intervalo_minutos já existe');
            } else {
                console.error('❌ Erro ao adicionar coluna:', err.message);
            }
        } else {
            console.log('✅ Coluna intervalo_minutos adicionada');
        }

        // 2. Verificar se tem horários
        db.get('SELECT COUNT(*) as total FROM horarios_funcionamento', (err, row) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                return;
            }

            if (row.total > 0) {
                console.log(`✅ Já existem ${row.total} horários`);

                // Mostrar horários
                db.all('SELECT * FROM horarios_funcionamento ORDER BY dia_semana', (err, rows) => {
                    if (err) {
                        console.error('❌ Erro:', err);
                    } else {
                        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                        console.log('📋 Horários:');
                        rows.forEach(r => {
                            const nome = dias[r.dia_semana] || r.dia_semana;
                            console.log(`   ${nome}: ${r.aberto ? '🟢 Aberto' : '🔴 Fechado'} - ${r.hora_inicio} às ${r.hora_fim}`);
                        });
                    }
                    db.close();
                });
                return;
            }

            // 3. Inserir horários padrão
            console.log('📝 Inserindo horários padrão...');
            db.exec(`
                INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                VALUES 
                    (${empresaId}, 1, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (${empresaId}, 2, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (${empresaId}, 3, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (${empresaId}, 4, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (${empresaId}, 5, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (${empresaId}, 6, 1, '08:00', '18:00', '12:00', '13:00', 30),
                    (${empresaId}, 7, 0, '08:00', '18:00', '12:00', '13:00', 30)
            `, (err) => {
                if (err) {
                    console.error('❌ Erro ao inserir horários:', err);
                } else {
                    console.log('✅ Horários padrão inseridos!');
                }
                db.close();
            });
        });
    });
}

// ============================================
// EXECUTAR
// ============================================
console.log(`🚀 CORRIGINDO HORÁRIOS DA EMPRESA ${EMPRESA_ID}...\n`);
corrigirHorarios(EMPRESA_ID);