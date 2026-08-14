// scripts/migrar-agendamentos-empresa5.js
const sqlite3 = require('sqlite3').verbose();

console.log('============================================================');
console.log('📋 MIGRANDO AGENDAMENTOS DA EMPRESA 5');
console.log('============================================================\n');

const dbOrigem = new sqlite3.Database('database/barbearia.db');
const dbDestino = new sqlite3.Database('database/empresa_5.db');

const EMPRESA_ID = 5;

// 1. Buscar agendamentos da empresa 5 no barbearia.db
dbOrigem.all('SELECT * FROM agendamentos WHERE empresa_id = ?', [EMPRESA_ID], (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        dbOrigem.close();
        dbDestino.close();
        return;
    }

    if (rows.length === 0) {
        console.log('✅ Nenhum agendamento da empresa 5 no barbearia.db');
        dbOrigem.close();
        dbDestino.close();
        return;
    }

    console.log(`📋 ${rows.length} agendamentos da empresa 5 encontrados no barbearia.db\n`);

    // 2. Verificar quantos já existem no empresa_5.db
    dbDestino.get('SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?', [EMPRESA_ID], (err, row) => {
        if (err) {
            console.error('❌ Erro:', err);
            dbOrigem.close();
            dbDestino.close();
            return;
        }

        const existentes = row.total || 0;
        console.log(`📊 ${existentes} agendamentos já existem no empresa_5.db\n`);

        // 3. Migrar apenas os que não existem
        let copiados = 0;
        let erros = 0;

        rows.forEach(ag => {
            // Verificar se já existe
            dbDestino.get('SELECT id FROM agendamentos WHERE id = ?', [ag.id], (err, row) => {
                if (err) {
                    console.error(`❌ Erro ao verificar ID ${ag.id}:`, err);
                    erros++;
                    return;
                }

                if (row) {
                    console.log(`⏭️ Agendamento ${ag.id} já existe, pulando...`);
                    return;
                }

                // Inserir no destino
                dbDestino.run(`
                    INSERT INTO agendamentos (
                        id, cliente_id, data, hora, servico_id, servico, valor, duracao,
                        status, comissao, empresa_id, profissional_id, lembrete_enviado,
                        valor_total, servicos_extras, valor_extras, forma_pagamento,
                        prazo_dias, data_vencimento, descricao_pagamento, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    ag.id, ag.cliente_id, ag.data, ag.hora,
                    ag.servico_id, ag.servico, ag.valor, ag.duracao,
                    ag.status, ag.comissao, ag.empresa_id,
                    ag.profissional_id, ag.lembrete_enviado,
                    ag.valor_total, ag.servicos_extras, ag.valor_extras,
                    ag.forma_pagamento, ag.prazo_dias, ag.data_vencimento,
                    ag.descricao_pagamento, ag.created_at
                ], function (err) {
                    if (err) {
                        console.error(`❌ Erro ao copiar agendamento ${ag.id}:`, err);
                        erros++;
                    } else {
                        copiados++;
                        console.log(`✅ Copiado agendamento ${ag.id}`);
                    }
                });
            });
        });

        setTimeout(() => {
            console.log('\n============================================================');
            console.log('📊 RESUMO');
            console.log('============================================================');
            console.log(`📋 Agendamentos no barbearia.db (empresa 5): ${rows.length}`);
            console.log(`📋 Agendamentos já existentes no empresa_5.db: ${existentes}`);
            console.log(`📋 Agendamentos copiados: ${copiados}`);
            console.log(`📋 Erros: ${erros}`);

            // Verificar resultado
            dbDestino.get('SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?', [EMPRESA_ID], (err, row) => {
                if (err) {
                    console.error('❌ Erro:', err);
                } else {
                    console.log(`\n✅ Total de agendamentos no empresa_5.db: ${row.total}`);
                }
                dbOrigem.close();
                dbDestino.close();
                console.log('\n📝 Reinicie o servidor: npm start');
            });
        }, 3000);
    });
});