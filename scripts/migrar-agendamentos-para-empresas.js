// ============================================
// SCRIPT: migrar-agendamentos-para-empresas.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const mainDbPath = path.join(__dirname, 'database/barbearia.db');
const dbDir = path.join(__dirname, 'database');

console.log('🔍 Migrando agendamentos do banco principal para as empresas...');

const mainDb = new sqlite3.Database(mainDbPath);

// Buscar todos os agendamentos do banco principal
mainDb.all(`SELECT * FROM agendamentos`, (err, agendamentos) => {
    if (err) {
        console.error('❌ Erro ao buscar agendamentos:', err.message);
        mainDb.close();
        return;
    }

    console.log(`📊 ${agendamentos.length} agendamentos encontrados no banco principal`);

    // Agrupar por empresa_id
    const porEmpresa = {};
    for (const ag of agendamentos) {
        const empresaId = ag.empresa_id;
        if (!porEmpresa[empresaId]) {
            porEmpresa[empresaId] = [];
        }
        porEmpresa[empresaId].push(ag);
    }

    console.log(`📊 Agendamentos por empresa:`, Object.keys(porEmpresa).map(id => `${id}: ${porEmpresa[id].length}`).join(', '));

    // Para cada empresa, inserir os agendamentos no banco da empresa
    for (const [empresaId, ags] of Object.entries(porEmpresa)) {
        const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);

        if (!require('fs').existsSync(dbPath)) {
            console.log(`⚠️ Banco da empresa ${empresaId} não existe, pulando...`);
            continue;
        }

        console.log(`\n📥 Inserindo ${ags.length} agendamentos na empresa ${empresaId}...`);

        const empresaDb = new sqlite3.Database(dbPath);

        // Verificar se a tabela existe
        empresaDb.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'`, (err, row) => {
            if (err) {
                console.error(`❌ Erro ao verificar tabela empresa ${empresaId}:`, err.message);
                empresaDb.close();
                return;
            }

            if (!row) {
                console.log(`⚠️ Tabela agendamentos não existe na empresa ${empresaId}, pulando...`);
                empresaDb.close();
                return;
            }

            // Inserir cada agendamento
            let inseridos = 0;
            let erros = 0;

            for (const ag of ags) {
                const sql = `
                    INSERT INTO agendamentos (
                        id, cliente_id, data, hora, servico_id, servico, valor, duracao, 
                        status, comissao, empresa_id, profissional_id, lembrete_enviado,
                        valor_total, servicos_extras, valor_extras, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                empresaDb.run(sql, [
                    ag.id, ag.cliente_id, ag.data, ag.hora, ag.servico_id, ag.servico,
                    ag.valor, ag.duracao, ag.status, ag.comissao, ag.empresa_id,
                    ag.profissional_id, ag.lembrete_enviado || 0,
                    ag.valor_total || 0, ag.servicos_extras || '[]', ag.valor_extras || 0,
                    ag.created_at
                ], (err) => {
                    if (err) {
                        erros++;
                        console.log(`   ⚠️ Erro ao inserir agendamento ${ag.id}:`, err.message);
                    } else {
                        inseridos++;
                    }
                });
            }

            // Aguardar um pouco para as inserções terminarem
            setTimeout(() => {
                console.log(`   ✅ ${inseridos} agendamentos inseridos, ${erros} erros`);
                empresaDb.close();
            }, 2000);
        });
    }

    mainDb.close();
});

console.log('\n✅ Migração concluída!');