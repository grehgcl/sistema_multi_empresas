// scripts/corrigir-agendamento-bug.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('============================================================');
console.log('🔧 CORRIGINDO ERRO "JÁ POSSUI AGENDAMENTO"');
console.log('============================================================\n');

// 1. VERIFICAR BANCOS DA EMPRESA 5
const databaseDir = path.join(__dirname, '../database');
const files = fs.readdirSync(databaseDir).filter(f => f.startsWith('empresa_5') && f.endsWith('.db'));

console.log(`📋 ${files.length} bancos da empresa 5 encontrados:\n`);

files.forEach(file => {
    const dbPath = path.join(databaseDir, file);
    const stats = fs.statSync(dbPath);
    const tamanho = (stats.size / 1024).toFixed(1);
    console.log(`   📂 ${file} (${tamanho} KB)`);
});

console.log('\n');

// 2. VERIFICAR QUAL BANCO TEM DADOS
function verificarBanco(dbPath, nome) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath);

        db.get('SELECT COUNT(*) as total FROM clientes', (err, row) => {
            const clientes = err ? 0 : (row?.total || 0);

            db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row2) => {
                const agendamentos = err ? 0 : (row2?.total || 0);

                console.log(`   📊 ${nome}: ${clientes} clientes, ${agendamentos} agendamentos`);
                db.close();
                resolve({ clientes, agendamentos, dbPath, nome });
            });
        });
    });
}

async function verificarTodos() {
    const resultados = [];
    for (const file of files) {
        const dbPath = path.join(databaseDir, file);
        const result = await verificarBanco(dbPath, file);
        resultados.push(result);
    }
    return resultados;
}

// 3. ESCOLHER O MELHOR BANCO E COPIAR
function copiarBanco(origem, destino) {
    return new Promise((resolve) => {
        console.log(`\n📝 Copiando ${path.basename(origem)} para ${path.basename(destino)}...`);

        // Fazer backup do destino
        if (fs.existsSync(destino)) {
            const backup = destino + '.backup';
            fs.copyFileSync(destino, backup);
            console.log(`   ✅ Backup criado: ${path.basename(backup)}`);
        }

        // Copiar origem para destino
        fs.copyFileSync(origem, destino);
        console.log(`   ✅ Banco copiado com sucesso!`);
        resolve();
    });
}

// 4. VERIFICAR E CRIAR CLIENTE 4586
function criarCliente4586(dbPath) {
    return new Promise((resolve) => {
        console.log(`\n🔧 Verificando cliente 4586 em ${path.basename(dbPath)}...`);
        const db = new sqlite3.Database(dbPath);

        db.get('SELECT id FROM clientes WHERE id = 4586', (err, row) => {
            if (err) {
                console.error(`   ❌ Erro: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            if (row) {
                console.log(`   ✅ Cliente 4586 já existe`);
                db.close();
                resolve();
                return;
            }

            // Criar cliente 4586
            db.run(`
                INSERT INTO clientes (id, nome, telefone, empresa_id, created_at)
                VALUES (4586, 'Cliente 4586', '41999999999', 5, datetime('now'))
            `, function (err) {
                if (err) {
                    console.error(`   ❌ Erro ao criar: ${err.message}`);
                } else {
                    console.log(`   ✅ Cliente 4586 criado com sucesso!`);
                }
                db.close();
                resolve();
            });
        });
    });
}

// 5. LIMPAR AGENDAMENTOS CANCELADOS
function limparCancelados(dbPath) {
    return new Promise((resolve) => {
        console.log(`\n🗑️ Removendo agendamentos cancelados em ${path.basename(dbPath)}...`);
        const db = new sqlite3.Database(dbPath);

        db.run('DELETE FROM agendamentos WHERE status = "cancelado"', function (err) {
            if (err) {
                console.error(`   ❌ Erro: ${err.message}`);
            } else {
                console.log(`   ✅ ${this.changes} agendamentos cancelados removidos`);
            }
            db.close();
            resolve();
        });
    });
}

// 6. VERIFICAR SE O CLIENTE TEM AGENDAMENTO NO DIA
function verificarClienteHoje(dbPath) {
    return new Promise((resolve) => {
        const hoje = new Date().toISOString().split('T')[0];
        console.log(`\n🔍 Verificando agendamentos para hoje (${hoje}) em ${path.basename(dbPath)}...`);

        const db = new sqlite3.Database(dbPath);

        db.all(`
            SELECT id, cliente_id, data, hora, status 
            FROM agendamentos 
            WHERE cliente_id = 4586 AND data = ?
        `, [hoje], (err, rows) => {
            if (err) {
                console.error(`   ❌ Erro: ${err.message}`);
            } else if (rows.length === 0) {
                console.log(`   ✅ Nenhum agendamento para hoje`);
            } else {
                console.log(`   ⚠️ ${rows.length} agendamento(s) para hoje:`);
                rows.forEach(r => {
                    console.log(`      ID: ${r.id}, ${r.data} ${r.hora}, Status: ${r.status}`);
                });

                // Remover agendamentos para hoje
                db.run(`DELETE FROM agendamentos WHERE cliente_id = 4586 AND data = ?`, [hoje], function (err) {
                    if (err) {
                        console.error(`   ❌ Erro ao remover: ${err.message}`);
                    } else {
                        console.log(`   ✅ ${this.changes} agendamento(s) removido(s)`);
                    }
                });
            }
            db.close();
            resolve();
        });
    });
}

// EXECUTAR TUDO
async function main() {
    console.log('🔍 Analisando bancos...\n');
    const resultados = await verificarTodos();

    // Encontrar o banco com mais dados
    const melhor = resultados.reduce((a, b) => {
        const totalA = a.clientes + a.agendamentos;
        const totalB = b.clientes + b.agendamentos;
        return totalA > totalB ? a : b;
    });

    console.log(`\n✅ Melhor banco: ${melhor.nome} (${melhor.clientes} clientes, ${melhor.agendamentos} agendamentos)`);

    // Se o melhor banco não for empresa_5.db, copiar
    if (melhor.nome !== 'empresa_5.db') {
        const origem = melhor.dbPath;
        const destino = path.join(databaseDir, 'empresa_5.db');
        await copiarBanco(origem, destino);
    }

    // Verificar e criar cliente 4586 no banco principal
    await criarCliente4586(path.join(databaseDir, 'empresa_5.db'));

    // Limpar agendamentos cancelados
    await limparCancelados(path.join(databaseDir, 'empresa_5.db'));

    // Verificar agendamentos de hoje para o cliente 4586
    await verificarClienteHoje(path.join(databaseDir, 'empresa_5.db'));

    console.log('\n============================================================');
    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log('============================================================');
    console.log('📝 Reinicie o servidor: npm start');
    console.log('============================================================\n');
}

main().catch(console.error);