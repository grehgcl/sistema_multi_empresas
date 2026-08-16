// excluir-agendamentos-studio.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('🗑️ EXCLUINDO AGENDAMENTOS');
console.log('   Empresa: Studio Sandro matias');
console.log('========================================\n');

// PRIMEIRO: VERIFICAR QUAL O ID DA EMPRESA
const dbPrincipal = new sqlite3.Database('database/barbearia.db');

// Buscar a empresa pelo nome
dbPrincipal.get(
    `SELECT id, nome FROM empresas WHERE nome = 'Studio Sandro matias'`,
    (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err);
            dbPrincipal.close();
            return;
        }

        if (!empresa) {
            console.log('❌ Empresa "Studio Sandro matias" não encontrada!');
            console.log('\n📋 Empresas disponíveis:');
            dbPrincipal.all('SELECT id, nome FROM empresas ORDER BY id', (err, rows) => {
                if (err) {
                    console.error('❌ Erro:', err);
                } else {
                    rows.forEach(e => console.log(`   ${e.id} - ${e.nome}`));
                }
                dbPrincipal.close();
            });
            return;
        }

        const empresaId = empresa.id;
        console.log(`✅ Empresa encontrada: ${empresa.nome} (ID: ${empresaId})`);

        // VERIFICAR SE O BANCO DA EMPRESA EXISTE
        const dbDir = path.join(__dirname, 'database');
        const arquivos = fs.readdirSync(dbDir);
        
        let dbPathEncontrado = null;
        for (const f of arquivos) {
            // Procura por qualquer banco que contenha o ID da empresa
            if (f.includes(`_${empresaId}.db`) || f === `empresa_${empresaId}.db`) {
                dbPathEncontrado = path.join(dbDir, f);
                break;
            }
        }

        if (!dbPathEncontrado) {
            console.log(`❌ Banco da empresa ${empresaId} não encontrado!`);
            console.log('\n📋 Bancos disponíveis:');
            arquivos.filter(f => f.endsWith('.db')).forEach(f => console.log(`   ${f}`));
            dbPrincipal.close();
            return;
        }

        console.log(`📁 Banco encontrado: ${path.basename(dbPathEncontrado)}`);

        // CONECTAR AO BANCO DA EMPRESA
        const dbEmpresa = new sqlite3.Database(dbPathEncontrado);

        // VERIFICAR QUANTOS AGENDAMENTOS EXISTEM
        dbEmpresa.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
            if (err) {
                console.error('❌ Erro ao contar agendamentos:', err);
                dbEmpresa.close();
                dbPrincipal.close();
                return;
            }

            const total = row?.total || 0;
            console.log(`\n📊 Agendamentos encontrados: ${total}`);

            if (total === 0) {
                console.log('✅ Nenhum agendamento para excluir!');
                dbEmpresa.close();
                dbPrincipal.close();
                return;
            }

            // MOSTRAR OS ÚLTIMOS 10 AGENDAMENTOS
            console.log('\n📋 Últimos agendamentos:');
            dbEmpresa.all(
                `SELECT id, data, hora, servico FROM agendamentos ORDER BY id DESC LIMIT 10`,
                (err, rows) => {
                    if (err) {
                        console.error('❌ Erro:', err);
                    } else {
                        rows.forEach(a => {
                            console.log(`   ID: ${a.id} | ${a.data} ${a.hora} | ${a.servico || 'N/A'}`);
                        });
                    }

                    console.log('\n⚠️ ATENÇÃO: Isso vai EXCLUIR PERMANENTEMENTE todos os agendamentos!');
                    console.log(`   Total: ${total} agendamentos`);
                    console.log(`   Empresa: ${empresa.nome} (ID: ${empresaId})`);
                    console.log(`   Banco: ${path.basename(dbPathEncontrado)}`);

                    // PERGUNTAR ANTES DE EXCLUIR
                    const readline = require('readline');
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });

                    rl.question('\n❓ Deseja realmente excluir TODOS os agendamentos? (digite SIM para confirmar): ', (resposta) => {
                        if (resposta.toUpperCase() === 'SIM') {
                            console.log('\n🗑️ Excluindo agendamentos...');

                            dbEmpresa.run('DELETE FROM agendamentos', function(err) {
                                if (err) {
                                    console.error('❌ Erro ao excluir:', err);
                                } else {
                                    console.log(`✅ ${this.changes} agendamentos excluídos com sucesso!`);
                                }

                                // VERIFICAR SE FOI EXCLUÍDO
                                dbEmpresa.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                                    if (err) {
                                        console.error('❌ Erro:', err);
                                    } else {
                                        console.log(`📊 Agendamentos restantes: ${row?.total || 0}`);
                                    }
                                    dbEmpresa.close();
                                    dbPrincipal.close();
                                    rl.close();
                                    console.log('\n✅ PROCESSO CONCLUÍDO!');
                                });
                            });
                        } else {
                            console.log('\n❌ Operação cancelada!');
                            dbEmpresa.close();
                            dbPrincipal.close();
                            rl.close();
                        }
                    });
                }
            );
        });
    }
);