// scripts/criar-agendamentos-teste.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function criarAgendamentosTeste(dbPath, empresaId, nomeEmpresa) {
    return new Promise((resolve) => {
        console.log(`\n📝 Criando agendamentos para ${nomeEmpresa} (ID: ${empresaId})`);

        const db = new sqlite3.Database(dbPath);

        // Verificar se já tem agendamentos
        db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
            if (err) {
                console.error(`   ❌ Erro: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            if (row.total > 0) {
                console.log(`   ✅ Já existem ${row.total} agendamentos`);
                db.close();
                resolve();
                return;
            }

            // Buscar clientes existentes
            db.all('SELECT id, nome FROM clientes LIMIT 5', (err, clientes) => {
                if (err) {
                    console.error(`   ❌ Erro ao buscar clientes: ${err.message}`);
                    db.close();
                    resolve();
                    return;
                }

                if (clientes.length === 0) {
                    console.log('   ⚠️ Nenhum cliente encontrado. Criando clientes primeiro...');

                    // Criar clientes
                    const novosClientes = [
                        ['Cliente 1', '41999999991'],
                        ['Cliente 2', '41999999992'],
                        ['Cliente 3', '41999999993'],
                        ['Cliente 4', '41999999994'],
                        ['Cliente 5', '41999999995']
                    ];

                    let count = 0;
                    novosClientes.forEach((c, index) => {
                        const id = 1000 + index;
                        db.run(`INSERT OR IGNORE INTO clientes (id, nome, telefone, empresa_id) VALUES (?, ?, ?, ?)`,
                            [id, c[0], c[1], empresaId], function (err) {
                                if (err) {
                                    console.error(`   ❌ Erro ao criar ${c[0]}: ${err.message}`);
                                } else {
                                    count++;
                                    console.log(`   ✅ ${c[0]} criado (ID: ${id})`);
                                }
                            });
                    });

                    setTimeout(() => {
                        // Recarregar clientes
                        db.all('SELECT id, nome FROM clientes LIMIT 5', (err, clientes) => {
                            if (err || clientes.length === 0) {
                                console.error(`   ❌ Erro: ${err?.message || 'Nenhum cliente criado'}`);
                                db.close();
                                resolve();
                                return;
                            }
                            criarAgendamentos(db, clientes, empresaId, resolve);
                        });
                    }, 1000);
                } else {
                    criarAgendamentos(db, clientes, empresaId, resolve);
                }
            });
        });
    });
}

function criarAgendamentos(db, clientes, empresaId, resolve) {
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const depois = new Date(hoje);
    depois.setDate(depois.getDate() + 2);

    const datas = [
        hoje.toISOString().split('T')[0],
        amanha.toISOString().split('T')[0],
        depois.toISOString().split('T')[0]
    ];

    const horarios = ['09:00', '10:30', '14:00', '16:30'];
    const status = ['pendente', 'agendado', 'concluido'];
    const servicos = ['Corte', 'Barba', 'Corte + Barba', 'Sobrancelha', 'Pezinho'];
    const valores = [30, 20, 45, 15, 25];

    const stmt = db.prepare(`
        INSERT INTO agendamentos (cliente_id, data, hora, servico, valor, duracao, status, empresa_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (let i = 0; i < 5; i++) {
        const cliente = clientes[i % clientes.length];
        const data = datas[i % datas.length];
        const hora = horarios[i % horarios.length];
        const statusAtual = status[i % status.length];
        const servico = servicos[i % servicos.length];
        const valor = valores[i % valores.length];

        stmt.run(cliente.id, data, hora, servico, valor, 30, statusAtual, empresaId);
        count++;
    }

    stmt.finalize();
    console.log(`   ✅ ${count} agendamentos de teste criados`);

    // Verificar
    db.all('SELECT id, cliente_id, data, hora, servico, status FROM agendamentos', (err, rows) => {
        if (err) {
            console.error(`   ❌ Erro: ${err.message}`);
        } else {
            console.log(`   📋 Agendamentos criados:`);
            rows.forEach(r => {
                console.log(`      ID: ${r.id}, Cliente: ${r.cliente_id}, ${r.data} ${r.hora} - ${r.servico} (${r.status})`);
            });
        }
        db.close();
        resolve();
    });
}

async function main() {
    console.log('============================================================');
    console.log('📝 CRIANDO AGENDAMENTOS DE TESTE');
    console.log('============================================================\n');

    // Para a empresa 5 (salao sandrinha2)
    const dbPath = path.join(__dirname, '../database/empresa_5_salao-sandrinha2.db');
    await criarAgendamentosTeste(dbPath, 5, 'salao sandrinha2');

    console.log('\n============================================================');
    console.log('✅ AGENDAMENTOS CRIADOS!');
    console.log('📝 Reinicie o servidor: npm start');
    console.log('============================================================');
}

main().catch(console.error);