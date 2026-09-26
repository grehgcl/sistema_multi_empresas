// verificar-agendamentos.js
// Script para verificar todos os bancos e onde estão os agendamentos

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

console.log('🔍 ============================================');
console.log('🔍 VERIFICANDO TODOS OS BANCOS DE DADOS');
console.log('🔍 ============================================\n');

// 1. VERIFICAR BANCO PRINCIPAL (barbearia.db)
function verificarBancoPrincipal() {
    return new Promise((resolve) => {
        const dbPath = './database/barbearia.db';
        if (!fs.existsSync(dbPath)) {
            console.log('❌ Banco principal não encontrado');
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);
        console.log('📁 BANCO PRINCIPAL (barbearia.db)');

        // Ver empresas
        db.all('SELECT id, nome FROM empresas ORDER BY id', (err, empresas) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                resolve();
                return;
            }

            empresas.forEach(empresa => {
                // Contar agendamentos
                db.get('SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?', [empresa.id], (err, row) => {
                    const total = row?.total || 0;
                    if (total > 0) {
                        console.log(`   ✅ Empresa ${empresa.id}: ${empresa.nome} - ${total} agendamentos`);
                        
                        // Mostrar os últimos 5
                        db.all('SELECT id, data, servico, status FROM agendamentos WHERE empresa_id = ? ORDER BY id DESC LIMIT 5', [empresa.id], (err, rows) => {
                            rows.forEach(r => {
                                console.log(`      📅 ${r.data} | ${r.servico} | ${r.status}`);
                            });
                        });
                    }
                });
            });

            setTimeout(() => {
                db.close();
                resolve();
            }, 1000);
        });
    });
}

// 2. VERIFICAR BANCOS DAS EMPRESAS (empresa_*.db)
function verificarBancosEmpresas() {
    return new Promise((resolve) => {
        const dbDir = './database/';
        if (!fs.existsSync(dbDir)) {
            console.log('❌ Pasta database não encontrada');
            resolve();
            return;
        }

        const files = fs.readdirSync(dbDir);
        const dbFiles = files.filter(f => f.startsWith('empresa_') && f.endsWith('.db'));

        if (dbFiles.length === 0) {
            console.log('📁 Nenhum banco de empresa encontrado');
            resolve();
            return;
        }

        console.log('\n📁 BANCOS DAS EMPRESAS (empresa_*.db)');

        dbFiles.forEach(file => {
            const dbPath = path.join(dbDir, file);
            const empresaId = file.replace('empresa_', '').replace('.db', '');
            
            const db = new sqlite3.Database(dbPath);
            
            // Verificar se tem tabela agendamentos
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'", (err, table) => {
                if (!table) {
                    console.log(`   ⚠️ ${file} - Sem tabela agendamentos`);
                    db.close();
                    return;
                }

                db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                    const total = row?.total || 0;
                    if (total > 0) {
                        console.log(`   ✅ ${file} - ${total} agendamentos`);
                        
                        db.all('SELECT id, data, servico, status FROM agendamentos ORDER BY id DESC LIMIT 5', (err, rows) => {
                            rows.forEach(r => {
                                console.log(`      📅 ${r.data} | ${r.servico} | ${r.status}`);
                            });
                            db.close();
                        });
                    } else {
                        db.close();
                    }
                });
            });
        });

        setTimeout(resolve, 2000);
    });
}

// 3. VERIFICAR BANCO DO STUDIO SANDRO (empresa_10.db especificamente)
function verificarStudioSandro() {
    return new Promise((resolve) => {
        const dbPath = './database/empresa_10.db';
        if (!fs.existsSync(dbPath)) {
            console.log('❌ Banco do Studio Sandro não encontrado');
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);
        console.log('\n📁 STUDIO SANDRO (empresa_10.db)');

        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'", (err, table) => {
            if (!table) {
                console.log('   ⚠️ Sem tabela agendamentos');
                db.close();
                resolve();
                return;
            }

            db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                const total = row?.total || 0;
                console.log(`   📊 Total: ${total} agendamentos`);

                if (total > 0) {
                    db.all('SELECT id, data, servico, status FROM agendamentos ORDER BY id DESC LIMIT 10', (err, rows) => {
                        console.log('   📋 Últimos agendamentos:');
                        rows.forEach(r => {
                            console.log(`      📅 ${r.data} | ${r.servico} | ${r.status}`);
                        });
                        db.close();
                        resolve();
                    });
                } else {
                    db.close();
                    resolve();
                }
            });
        });
    });
}

// 4. VERIFICAR CLIENTES COM NOME DIGREGORIO
function verificarClienteDigregorio() {
    return new Promise((resolve) => {
        const dbPath = './database/barbearia.db';
        if (!fs.existsSync(dbPath)) {
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);
        console.log('\n🔍 BUSCANDO CLIENTE "DIGREGORIO"...');

        db.all("SELECT id, nome, empresa_id FROM clientes WHERE nome LIKE '%Digregorio%' OR nome LIKE '%gregorio%'", (err, rows) => {
            if (err || rows.length === 0) {
                console.log('   ❌ Cliente não encontrado no banco principal');
                db.close();
                resolve();
                return;
            }

            rows.forEach(r => {
                console.log(`   ✅ Cliente: ${r.nome} (ID: ${r.id}, Empresa: ${r.empresa_id})`);
            });
            db.close();
            resolve();
        });
    });
}

// EXECUTAR TUDO
async function main() {
    await verificarBancoPrincipal();
    await verificarBancosEmpresas();
    await verificarStudioSandro();
    await verificarClienteDigregorio();
    
    console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
}

main();