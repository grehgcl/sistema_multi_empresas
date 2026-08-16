// ============================================
// SCRIPT: criar-horarios-empresas-faltantes.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 Criando tabela horarios_funcionamento para empresas faltantes...');

const dbDir = path.join(__dirname, 'database');

// Empresas que precisam de correção
const empresasFaltantes = [3, 4, 6, 7];

for (const empresaId of empresasFaltantes) {
    const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);

    if (!fs.existsSync(dbPath)) {
        console.log(`⚠️ Banco da empresa ${empresaId} não existe, pulando...`);
        continue;
    }

    console.log(`\n🔧 Processando empresa ${empresaId}...`);

    const db = new sqlite3.Database(dbPath);

    // 1. Criar tabela se não existir
    db.run(`
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
        )
    `, (err) => {
        if (err) {
            console.error(`❌ Erro ao criar tabela empresa ${empresaId}:`, err.message);
            db.close();
            return;
        }
        console.log(`✅ Tabela criada empresa ${empresaId}`);
    });

    // 2. Inserir horários padrão
    const dias = [
        { dia: 0, aberto: 0, nome: 'Domingo' },
        { dia: 1, aberto: 1, nome: 'Segunda' },
        { dia: 2, aberto: 1, nome: 'Terça' },
        { dia: 3, aberto: 1, nome: 'Quarta' },
        { dia: 4, aberto: 1, nome: 'Quinta' },
        { dia: 5, aberto: 1, nome: 'Sexta' },
        { dia: 6, aberto: 1, nome: 'Sábado' }
    ];

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO horarios_funcionamento 
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
    console.log(`✅ Horários padrão inseridos empresa ${empresaId}`);

    db.close(() => {
        console.log(`✅ Banco empresa ${empresaId} fechado`);
    });
}

console.log('\n✅ Todas as empresas corrigidas!');