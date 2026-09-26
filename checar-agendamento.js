// checar-agendamento.js
// Roda com: node checar-agendamento.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const PASTA_DB = path.join(__dirname, 'database');

console.log('═══════════════════════════════════════════════');
console.log('🔍 DIAGNÓSTICO DE AGENDAMENTOS');
console.log('═══════════════════════════════════════════════\n');

// Lista profissionais de cada banco
async function listarProfissionais(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        db.all(
            `SELECT id, nome, email, ativo, empresa_id FROM profissionais`,
            [],
            (err, rows) => {
                db.close();
                resolve(err ? [] : (rows || []));
            }
        );
    });
}

// Lista os últimos agendamentos de cada banco
async function listarAgendamentos(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        db.all(
            `SELECT 
                id, cliente_id, profissional_id, servico_id, servico,
                data, hora, status, valor, comissao, empresa_id,
                created_at
             FROM agendamentos 
             ORDER BY id DESC 
             LIMIT 15`,
            [],
            (err, rows) => {
                db.close();
                resolve(err ? [] : (rows || []));
            }
        );
    });
}

// Busca nome do cliente
async function nomeCliente(dbPath, clienteId) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        db.get(
            `SELECT nome FROM clientes WHERE id = ?`,
            [clienteId],
            (err, row) => {
                db.close();
                resolve(err || !row ? `[id ${clienteId}]` : row.nome);
            }
        );
    });
}

async function main() {
    const arquivos = fs.readdirSync(PASTA_DB).filter(f => f.endsWith('.db'));
    
    console.log(`📁 ${arquivos.length} bancos encontrados:\n`);

    for (const arq of arquivos) {
        const dbPath = path.join(PASTA_DB, arq);
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📁 ${arq}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Profissionais
        const profs = await listarProfissionais(dbPath, arq);
        if (profs.length > 0) {
            console.log(`\n👥 Profissionais (${profs.length}):`);
            for (const p of profs) {
                const ativoStr = p.ativo === 1 || p.ativo === '1' || p.ativo === 'true' || p.ativo === true ? '🟢' : '🔴';
                console.log(`   ${ativoStr} ID ${p.id} | ${p.nome} | ${p.email} | empresa ${p.empresa_id}`);
            }
        } else {
            console.log(`\n👥 Nenhum profissional`);
        }

        // Agendamentos
        const ags = await listarAgendamentos(dbPath, arq);
        if (ags.length > 0) {
            console.log(`\n📅 Últimos 15 agendamentos:`);
            console.log(`   ${'ID'.padEnd(5)} ${'Cliente'.padEnd(20)} ${'Prof.ID'.padEnd(8)} ${'Data'.padEnd(12)} ${'Hora'.padEnd(6)} ${'Status'.padEnd(12)} ${'Empresa'.padEnd(8)}`);
            console.log(`   ${'─'.repeat(80)}`);
            for (const a of ags) {
                const nome = await nomeCliente(dbPath, a.cliente_id);
                const profId = a.profissional_id || '(null)';
                console.log(`   ${String(a.id).padEnd(5)} ${nome.substring(0, 19).padEnd(20)} ${String(profId).padEnd(8)} ${(a.data || '-').padEnd(12)} ${(a.hora || '-').padEnd(6)} ${(a.status || '-').padEnd(12)} ${String(a.empresa_id || '-').padEnd(8)}`);
            }
        } else {
            console.log(`\n📅 Nenhum agendamento`);
        }
    }

    console.log(`\n═══════════════════════════════════════════════\n`);
}

main().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});