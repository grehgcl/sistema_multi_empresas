// scripts/migrate-vps.js - CORRIGIDO COM SENHA EXPLÍCITA

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function migrateVPS() {
    console.log('🔵 Conectando ao banco da VPS...');

    // 🔥 CORREÇÃO: USAR SENHA EXPLÍCITA
    const pool = new Pool({
        host: '163.176.218.131',
        port: 5432,
        database: 'seeagende',
        user: 'barbearia_user',
        password: 'seeagende2024',  // ← SENHA EXPLÍCITA
        ssl: false
    });

    const dbPath = path.join(__dirname, '..', 'database', 'barbearia.db');

    // Verificar se o SQLite existe
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Arquivo SQLite não encontrado:', dbPath);
        return;
    }

    const sqlite = new sqlite3.Database(dbPath);
    console.log('✅ Conectado ao SQLite');

    // Buscar dados do SQLite
    const agendamentos = await new Promise((resolve, reject) => {
        sqlite.all('SELECT * FROM agendamentos', (err, rows) => {
            if (err) {
                console.error('❌ Erro ao ler SQLite:', err);
                reject(err);
            } else {
                console.log(`📊 ${rows.length} agendamentos encontrados no SQLite`);
                resolve(rows);
            }
        });
    });

    if (agendamentos.length === 0) {
        console.log('⚠️ Nenhum agendamento para migrar');
        sqlite.close();
        await pool.end();
        return;
    }

    console.log('🔄 Iniciando migração...');

    // Inserir no PostgreSQL
    let inseridos = 0;
    for (const ag of agendamentos) {
        try {
            await pool.query(
                `INSERT INTO agendamentos 
                 (id, cliente_id, data, hora, servico, valor, status, empresa_id, 
                  comissao, profissional_id, servico_id, lembrete_enviado, duracao, 
                  servicos_extras, valor_extras, valor_total) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                 ON CONFLICT (id) DO UPDATE SET
                 cliente_id = EXCLUDED.cliente_id,
                 data = EXCLUDED.data,
                 hora = EXCLUDED.hora,
                 servico = EXCLUDED.servico,
                 valor = EXCLUDED.valor,
                 status = EXCLUDED.status,
                 empresa_id = EXCLUDED.empresa_id,
                 comissao = EXCLUDED.comissao,
                 profissional_id = EXCLUDED.profissional_id,
                 servico_id = EXCLUDED.servico_id,
                 lembrete_enviado = EXCLUDED.lembrete_enviado,
                 duracao = EXCLUDED.duracao,
                 servicos_extras = EXCLUDED.servicos_extras,
                 valor_extras = EXCLUDED.valor_extras,
                 valor_total = EXCLUDED.valor_total`,
                [
                    ag.id, ag.cliente_id, ag.data, ag.hora, ag.servico, ag.valor,
                    ag.status, ag.empresa_id, ag.comissao, ag.profissional_id,
                    ag.servico_id, ag.lembrete_enviado || 0, ag.duracao || 30,
                    ag.servicos_extras || '[]', ag.valor_extras || 0, ag.valor_total || ag.valor || 0
                ]
            );
            inseridos++;
        } catch (err) {
            console.error(`❌ Erro ao inserir agendamento ${ag.id}:`, err.message);
        }
    }

    console.log(`✅ ${inseridos} agendamentos migrados!`);

    await pool.end();
    sqlite.close();
    console.log('🔒 Conexão fechada.');
}

migrateVPS().catch(err => {
    console.error('❌ Erro na migração:', err.message);
    console.error('Detalhes:', err);
    process.exit(1);
});