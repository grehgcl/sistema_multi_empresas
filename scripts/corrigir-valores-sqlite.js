const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, '..', 'database', 'barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Conectado ao banco:', dbPath);
console.log('📊 Corrigindo valores dos agendamentos...\n');

// Primeiro, buscar todos os serviços
db.all(`SELECT id, nome, valor FROM servicos`, (err, servicos) => {
    if (err) {
        console.error('❌ Erro ao buscar serviços:', err.message);
        db.close();
        return;
    }

    console.log('📋 Serviços disponíveis:');
    servicos.forEach(s => {
        console.log(`   ID: ${s.id} | ${s.nome} | R$ ${s.valor}`);
    });
    console.log('');

    // Buscar todos os agendamentos
    db.all(`SELECT id, data, servico, valor, valor_total, status, servico_id FROM agendamentos`, (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err.message);
            db.close();
            return;
        }

        console.log(`📊 Total de agendamentos: ${agendamentos.length}`);
        console.log('');

        let atualizados = 0;
        let ignorados = 0;
        let processados = 0;

        if (agendamentos.length === 0) {
            console.log('⚠️ Nenhum agendamento encontrado!');
            db.close();
            return;
        }

        // Processar cada agendamento
        agendamentos.forEach((row) => {
            processados++;

            // Verificar se é concluído (case insensitive)
            const isConcluido = row.status && row.status.toLowerCase().includes('conclu');

            if (!isConcluido) {
                ignorados++;
                console.log(`⏭️ [${processados}/${agendamentos.length}] ID ${row.id} - status "${row.status}" ignorado`);
                if (processados === agendamentos.length) {
                    finalizar();
                }
                return;
            }

            // Se já tem valor, pula
            if (row.valor && parseFloat(row.valor) > 0) {
                ignorados++;
                console.log(`✅ [${processados}/${agendamentos.length}] ID ${row.id} - já tem valor R$ ${row.valor}`);
                if (processados === agendamentos.length) {
                    finalizar();
                }
                return;
            }

            // Buscar valor do serviço
            let novoValor = 0;
            let servicoNome = '';

            // Tentar pelo servico_id
            if (row.servico_id) {
                const servico = servicos.find(s => s.id === row.servico_id);
                if (servico) {
                    novoValor = parseFloat(servico.valor) || 0;
                    servicoNome = servico.nome;
                }
            }

            // Se não encontrou, tentar pelo nome do serviço
            if (novoValor === 0 && row.servico) {
                const servico = servicos.find(s => s.nome && s.nome.toLowerCase() === row.servico.toLowerCase());
                if (servico) {
                    novoValor = parseFloat(servico.valor) || 0;
                    servicoNome = servico.nome;
                }
            }

            // Se ainda não tem valor, usar 45 como padrão (Degrade)
            if (novoValor === 0) {
                novoValor = 45;
                servicoNome = 'Degrade (padrão)';
                console.log(`⚠️ [${processados}/${agendamentos.length}] ID ${row.id} - usando valor padrão R$ 45`);
            } else {
                console.log(`📝 [${processados}/${agendamentos.length}] ID ${row.id} - ${servicoNome} = R$ ${novoValor}`);
            }

            // Atualizar o agendamento
            db.run(`
                UPDATE agendamentos 
                SET valor = ?, valor_total = ? 
                WHERE id = ?
            `, [novoValor, novoValor, row.id], function (err) {
                if (err) {
                    console.error(`❌ Erro ao atualizar ID ${row.id}:`, err.message);
                } else {
                    atualizados++;
                    console.log(`✅ [${processados}/${agendamentos.length}] ID ${row.id} atualizado para R$ ${novoValor}`);
                }

                if (processados === agendamentos.length) {
                    finalizar();
                }
            });
        });

        function finalizar() {
            console.log('\n' + '='.repeat(50));
            console.log(`📊 Resumo:`);
            console.log(`   ✅ Atualizados: ${atualizados}`);
            console.log(`   ⏭️ Ignorados: ${ignorados}`);
            console.log(`   📊 Total: ${agendamentos.length}`);
            console.log('='.repeat(50) + '\n');

            // Verificar resultado final
            db.all(`SELECT id, data, servico, valor, valor_total, status FROM agendamentos WHERE status LIKE '%conclu%'`, (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao buscar resultado:', err.message);
                } else {
                    console.log('📊 Agendamentos concluídos:');
                    console.table(rows);
                }
                db.close();
                console.log('✅ Script finalizado!');
            });
        }
    });
});