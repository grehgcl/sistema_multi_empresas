// scripts/inserir-horarios.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/barbearia.db');
const db = new sqlite3.Database(dbPath);

const EMPRESA_ID = 14;

console.log(`🔧 Inserindo horários para empresa ${EMPRESA_ID}...`);

// Verificar se já existem horários
db.get('SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?', [EMPRESA_ID], (err, row) => {
    if (err) {
        console.error('❌ Erro ao verificar horários:', err.message);
        db.close();
        return;
    }

    if (row.total > 0) {
        console.log(`✅ Já existem ${row.total} horários para empresa ${EMPRESA_ID}`);
        db.close();
        return;
    }

    // Inserir horários padrão
    const sql = `
        INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
        VALUES 
            (?, 1, 1, '08:00', '18:00', '12:00', '13:00'),
            (?, 2, 1, '08:00', '18:00', '12:00', '13:00'),
            (?, 3, 1, '08:00', '18:00', '12:00', '13:00'),
            (?, 4, 1, '08:00', '18:00', '12:00', '13:00'),
            (?, 5, 1, '08:00', '18:00', '12:00', '13:00'),
            (?, 6, 1, '08:00', '18:00', '12:00', '13:00'),
            (?, 7, 0, '08:00', '18:00', '12:00', '13:00')
    `;

    db.run(sql, [EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID, EMPRESA_ID], function (err) {
        if (err) {
            console.error('❌ Erro ao inserir horários:', err.message);
        } else {
            console.log(`✅ ${this.changes} horários inseridos para empresa ${EMPRESA_ID}`);

            // Verificar os horários inseridos
            db.all('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana', [EMPRESA_ID], (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao buscar horários:', err.message);
                } else {
                    console.log('\n📋 Horários da empresa:');
                    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                    rows.forEach(r => {
                        const dia = dias[r.dia_semana] || r.dia_semana;
                        const status = r.aberto ? '✅ Aberto' : '❌ Fechado';
                        console.log(`   ${dia}: ${status} - ${r.hora_inicio} às ${r.hora_fim}`);
                    });
                }
                db.close();
            });
        }
    });
});