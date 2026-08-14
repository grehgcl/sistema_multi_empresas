// scripts/verificar-bancos-empresas.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Cores para o console
const cores = {
    verde: '\x1b[32m',
    amarelo: '\x1b[33m',
    azul: '\x1b[34m',
    vermelho: '\x1b[31m',
    reset: '\x1b[0m',
    negrito: '\x1b[1m'
};

function logVerde(msg) { console.log(`${cores.verde}✅ ${msg}${cores.reset}`); }
function logAmarelo(msg) { console.log(`${cores.amarelo}⚠️ ${msg}${cores.reset}`); }
function logAzul(msg) { console.log(`${cores.azul}📋 ${msg}${cores.reset}`); }
function logVermelho(msg) { console.log(`${cores.vermelho}❌ ${msg}${cores.reset}`); }
function logNegrito(msg) { console.log(`${cores.negrito}${msg}${cores.reset}`); }

// ============================================
// FUNÇÃO PARA VERIFICAR UM BANCO
// ============================================

function verificarBancoEmpresa(dbPath, empresaId) {
    return new Promise((resolve) => {
        if (!fs.existsSync(dbPath)) {
            console.log(`   ⚠️ Banco não existe: ${path.basename(dbPath)}`);
            resolve(null);
            return;
        }

        const db = new sqlite3.Database(dbPath);
        const resultado = { empresaId, existe: true, dados: {} };

        // Contar registros nas tabelas
        const tabelas = ['clientes', 'profissionais', 'servicos', 'agendamentos', 'despesas', 'horarios_funcionamento'];
        let pendentes = tabelas.length;

        tabelas.forEach(tabela => {
            db.get(`SELECT COUNT(*) as total FROM ${tabela}`, (err, row) => {
                if (err) {
                    resultado.dados[tabela] = '❌ Erro';
                } else {
                    resultado.dados[tabela] = row.total;
                }
                pendentes--;
                if (pendentes === 0) {
                    db.close();
                    resolve(resultado);
                }
            });
        });

        // Se não houver tabelas, fechar
        setTimeout(() => {
            if (pendentes > 0) {
                db.close();
                resolve(resultado);
            }
        }, 3000);
    });
}

// ============================================
// FUNÇÃO PARA VERIFICAR EMPRESAS NO CENTRAL
// ============================================

function getEmpresasDoCentral() {
    return new Promise((resolve) => {
        const centralDbPath = path.join(__dirname, '../database/central.db');

        if (!fs.existsSync(centralDbPath)) {
            logVermelho('Banco central não encontrado!');
            resolve([]);
            return;
        }

        const db = new sqlite3.Database(centralDbPath);

        db.all('SELECT id, nome, plano, created_at FROM empresas ORDER BY id', (err, rows) => {
            if (err) {
                logVermelho('Erro ao buscar empresas:', err.message);
                resolve([]);
                return;
            }
            db.close();
            resolve(rows || []);
        });
    });
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function main() {
    console.log('\n' + '='.repeat(60));
    logNegrito('🏢 VERIFICANDO BANCOS POR EMPRESA');
    console.log('='.repeat(60) + '\n');

    // 1. Buscar empresas do banco central
    const empresas = await getEmpresasDoCentral();

    if (empresas.length === 0) {
        logVermelho('Nenhuma empresa encontrada no banco central');
        return;
    }

    console.log(`📋 ${empresas.length} empresas encontradas no banco central:\n`);

    // 2. Verificar cada empresa
    const resultados = [];
    for (const empresa of empresas) {
        const dbPath = path.join(__dirname, `../database/empresa_${empresa.id}.db`);
        console.log(`\n${cores.negrito}📁 Empresa ${empresa.id}: ${empresa.nome}${cores.reset}`);
        console.log(`   Plano: ${empresa.plano || 'trial'}`);
        console.log(`   Criada em: ${empresa.created_at || 'N/A'}`);
        console.log(`   Banco: ${fs.existsSync(dbPath) ? '✅ Existe' : '❌ Não existe'}`);

        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            const tamanho = (stats.size / 1024).toFixed(1);
            console.log(`   Tamanho: ${tamanho} KB`);

            const resultado = await verificarBancoEmpresa(dbPath, empresa.id);
            if (resultado) {
                resultados.push(resultado);
                console.log(`   📊 Registros:`);
                for (const [tabela, total] of Object.entries(resultado.dados)) {
                    const cor = total > 0 ? cores.verde : cores.amarelo;
                    console.log(`      ${tabela}: ${cor}${total}${cores.reset}`);
                }
            }
        }
    }

    // 3. Resumo
    console.log('\n' + '='.repeat(60));
    logNegrito('📊 RESUMO GERAL');
    console.log('='.repeat(60) + '\n');

    let totalClientes = 0;
    let totalAgendamentos = 0;
    let totalProfissionais = 0;
    let totalServicos = 0;
    let totalDespesas = 0;

    for (const r of resultados) {
        totalClientes += parseInt(r.dados.clientes) || 0;
        totalAgendamentos += parseInt(r.dados.agendamentos) || 0;
        totalProfissionais += parseInt(r.dados.profissionais) || 0;
        totalServicos += parseInt(r.dados.servicos) || 0;
        totalDespesas += parseInt(r.dados.despesas) || 0;
    }

    console.log(`📋 Total de empresas: ${resultados.length}`);
    console.log(`👤 Total de clientes: ${totalClientes}`);
    console.log(`📅 Total de agendamentos: ${totalAgendamentos}`);
    console.log(`👨‍💼 Total de profissionais: ${totalProfissionais}`);
    console.log(`✂️ Total de serviços: ${totalServicos}`);
    console.log(`💰 Total de despesas: ${totalDespesas}`);

    // 4. Verificar agendamentos por empresa (detalhado)
    console.log('\n' + '='.repeat(60));
    logNegrito('📅 AGENDAMENTOS POR EMPRESA');
    console.log('='.repeat(60) + '\n');

    for (const r of resultados) {
        const total = parseInt(r.dados.agendamentos) || 0;
        const cor = total > 0 ? cores.verde : cores.amarelo;
        const empresa = empresas.find(e => e.id === r.empresaId);
        console.log(`   Empresa ${r.empresaId}: ${empresa?.nome || 'N/A'} - ${cor}${total}${cores.reset} agendamentos`);
    }

    // 5. Verificar se há dados cruzados (problema)
    console.log('\n' + '='.repeat(60));
    logNegrito('🔍 VERIFICANDO ISOLAMENTO');
    console.log('='.repeat(60) + '\n');

    // Verificar se algum cliente está em empresa errada (apenas exemplo)
    let problemas = 0;
    for (const r of resultados) {
        const dbPath = path.join(__dirname, `../database/empresa_${r.empresaId}.db`);
        if (fs.existsSync(dbPath)) {
            const db = new sqlite3.Database(dbPath);
            db.get('SELECT COUNT(*) as total FROM clientes WHERE empresa_id != ?', [r.empresaId], (err, row) => {
                if (err) {
                    // Ignorar erro
                } else if (row.total > 0) {
                    problemas += row.total;
                    logVermelho(`   ⚠️ Empresa ${r.empresaId} tem ${row.total} clientes com empresa_id errado!`);
                }
                db.close();
            });
        }
    }

    if (problemas === 0) {
        logVerde('✅ Nenhum problema de isolamento encontrado!');
    } else {
        logVermelho(`⚠️ Encontrados ${problemas} problemas de isolamento!`);
    }

    console.log('\n' + '='.repeat(60));
    logVerde('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
