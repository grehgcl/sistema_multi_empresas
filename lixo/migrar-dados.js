const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const oldDb = new sqlite3.Database(path.join('C:', 'Users', 'jonat', 'Documents', 'app_salao_na_regua', 'src', 'database', 'barbearia.db'));
const newDb = new sqlite3.Database(path.join(__dirname, '..', 'database', 'barbearia.db'));

console.log('🔄 Iniciando migração de dados...\n');

// Migrar empresas
oldDb.all("SELECT * FROM empresas", (err, empresas) => {
    if (err) {
        console.log('Nenhuma empresa encontrada no banco antigo');
    } else if (empresas && empresas.length > 0) {
        empresas.forEach(emp => {
            newDb.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (?, ?, ?)`, 
                [emp.id, emp.nome, emp.plano || 'gratuito']);
        });
        console.log(`✅ Migradas ${empresas.length} empresas`);
    }
    
    // Migrar usuários/barbeiros
    oldDb.all("SELECT * FROM barbeiros", (err, barbeiros) => {
        if (err || !barbeiros || barbeiros.length === 0) {
            console.log('Nenhum barbeiro encontrado');
        } else {
            barbeiros.forEach(bar => {
                newDb.run(`INSERT OR IGNORE INTO usuarios (id, nome, email, comissao_percentual, empresa_id, role) VALUES (?, ?, ?, ?, ?, ?)`,
                    [bar.id, bar.nome, bar.email || `${bar.nome.replace(/ /g, '_')}@email.com`, bar.comissao || 30, bar.empresa_id || 2, 'barbeiro']);
            });
            console.log(`✅ Migrados ${barbeiros.length} barbeiros`);
        }
        
        // Migrar agendamentos concluídos
        oldDb.all("SELECT * FROM agendamentos WHERE status = 'concluido' OR status = 'finalizado'", (err, agendamentos) => {
            if (err || !agendamentos || agendamentos.length === 0) {
                console.log('Nenhum agendamento concluído encontrado');
            } else {
                let processados = 0;
                agendamentos.forEach(ag => {
                    newDb.run(`INSERT OR IGNORE INTO agendamentos (id, cliente_id, barbeiro_id, servico_id, data, hora, valor_total, status, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [ag.id, ag.cliente_id, ag.barbeiro_id, ag.servico_id, ag.data, ag.hora, ag.preco, 'concluido', ag.empresa_id || 2], (err) => {
                            if (!err) processados++;
                        });
                    
                    // Gerar comissão automaticamente
                    newDb.get(`SELECT comissao_percentual FROM usuarios WHERE id = ?`, [ag.barbeiro_id], (err, bar) => {
                        const percentual = bar?.comissao_percentual || 30;
                        const valorComissao = (ag.preco * percentual) / 100;
                        
                        newDb.run(`INSERT OR IGNORE INTO comissoes (agendamento_id, barbeiro_id, valor, data, status, empresa_id) VALUES (?, ?, ?, ?, ?, ?)`,
                            [ag.id, ag.barbeiro_id, valorComissao, ag.data, 'pago', ag.empresa_id || 2]);
                    });
                });
                
                setTimeout(() => {
                    console.log(`✅ Migrados ${processados} agendamentos e geradas comissões`);
                    finalizar();
                }, 3000);
            }
            
            function finalizar() {
                console.log('\n🎉 Migração concluída!');
                oldDb.close();
                newDb.close();
            }
            
            if (!agendamentos || agendamentos.length === 0) {
                finalizar();
            }
        });
    });
});