// ============================================
// SCRIPT: adicionar-intervalo-todas-empresas.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 Adicionando coluna intervalo_minutos em TODAS as empresas...');

const dbDir = path.join(__dirname, 'database');
const empresas = [];

// Listar todos os bancos de empresa
const files = fs.readdirSync(dbDir);
for (const file of files) {
    if (file.startsWith('empresa_') && file.endsWith('.db')) {
        const id = parseInt(file.replace('empresa_', '').replace('.db', ''));
        empresas.push(id);
    }
}

console.log(`📊 Empresas encontradas: ${empresas.length}`);

for (const empresaId of empresas) {
    const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);
    console.log(`\n🔧 Processando empresa ${empresaId}...`);

    const db = new sqlite3.Database(dbPath);

    // Adicionar coluna intervalo_minutos
    db.run(`ALTER TABLE horarios_funcionamento ADD COLUMN intervalo_minutos INTEGER DEFAULT 30`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️ Coluna já existe na empresa ${empresaId}`);
            } else {
                console.log(`   ⚠️ Erro na empresa ${empresaId}:`, err.message);
            }
        } else {
            console.log(`   ✅ Coluna adicionada na empresa ${empresaId}`);
        }
    });

    // Verificar se tem horários
    db.get(`SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?`, [empresaId], (err, row) => {
        if (err) {
            console.log(`   ❌ Erro ao verificar horários da empresa ${empresaId}`);
            db.close();
            return;
        }

        if (row.total === 0) {
            console.log(`   📅 Inserindo horários padrão para empresa ${empresaId}...`);

            const dias = [
                { dia: 0, aberto: 0 },
                { dia: 1, aberto: 1 },
                { dia: 2, aberto: 1 },
                { dia: 3, aberto: 1 },
                { dia: 4, aberto: 1 },
                { dia: 5, aberto: 1 },
                { dia: 6, aberto: 1 }
            ];

            const stmt = db.prepare(`
                INSERT INTO horarios_funcionamento 
                (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const d of dias) {
                stmt.run([
                    empresaId,
                    d.dia,
                    d.aberto,
                    d.aberto === 1 ? '08:00' : '00:00',
                    d.aberto === 1 ? '18:00' : '00:00',
                    d.aberto === 1 ? '12:00' : '00:00',
                    d.aberto === 1 ? '13:00' : '00:00',
                    30
                ]);
            }

            stmt.finalize();
            console.log(`   ✅ Horários padrão inseridos para empresa ${empresaId}`);
        } else {
            console.log(`   ✅ Empresa ${empresaId} já tem ${row.total} horários`);
        }
    });

    db.close(() => {
        console.log(`   ✅ Banco empresa ${empresaId} fechado`);
    });
}

console.log('\n✅ Todas as empresas atualizadas!');