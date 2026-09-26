// verificar-profissional.js
// Roda com: node verificar-profissional.js
// Ou:       node verificar-profissional.js luis@gmail.com

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const EMAIL_BUSCA = process.argv[2] || 'luis@gmail.com';
const PASTA_DB = path.join(__dirname, 'database');

console.log('═══════════════════════════════════════════════');
console.log(`🔍 Buscando: ${EMAIL_BUSCA}`);
console.log('═══════════════════════════════════════════════\n');

// Função helper: abrir banco e rodar query
function rodarQuery(dbPath, sql, params = []) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) return resolve({ erro: `Não abriu: ${err.message}`, rows: [] });
        });

        db.all(sql, params, (err, rows) => {
            db.close();
            if (err) return resolve({ erro: `Query falhou: ${err.message}`, rows: [] });
            resolve({ erro: null, rows: rows || [] });
        });
    });
}

async function main() {
    // 1. Listar todos os bancos
    let arquivos = [];
    try {
        arquivos = fs.readdirSync(PASTA_DB).filter(f => f.endsWith('.db'));
    } catch (e) {
        console.error('❌ Erro ao listar pasta database/:', e.message);
        process.exit(1);
    }

    console.log(`📁 ${arquivos.length} bancos encontrados:\n`);
    for (const arq of arquivos) {
        const stat = fs.statSync(path.join(PASTA_DB, arq));
        console.log(`   • ${arq} (${(stat.size / 1024).toFixed(1)} KB)`);
    }
    console.log('');

    // 2. Para cada banco, procura o email em `usuarios` e `profissionais`
    let achouEmUsuarios = null;
    let achouEmProfissionais = null;
    const todosProfissionais = [];

    for (const arq of arquivos) {
        const dbPath = path.join(PASTA_DB, arq);

        // Tenta em usuarios
        const resUsuarios = await rodarQuery(
            dbPath,
            `SELECT id, nome, email, role, empresa_id FROM usuarios WHERE email = ?`,
            [EMAIL_BUSCA]
        );
        if (resUsuarios.rows && resUsuarios.rows.length > 0) {
            achouEmUsuarios = { arquivo: arq, ...resUsuarios.rows[0] };
            console.log(`✅ Encontrado em USUARIOS no banco: ${arq}`);
            console.log(`   →`, resUsuarios.rows[0]);
            console.log('');
        }

        // Tenta em profissionais
        const resProf = await rodarQuery(
            dbPath,
            `SELECT id, nome, email, ativo, empresa_id, substr(senha, 1, 15) as senha_preview FROM profissionais WHERE email = ?`,
            [EMAIL_BUSCA]
        );
        if (resProf.rows && resProf.rows.length > 0) {
            achouEmProfissionais = { arquivo: arq, ...resProf.rows[0] };
            console.log(`✅ Encontrado em PROFISSIONAIS no banco: ${arq}`);
            console.log(`   →`, resProf.rows[0]);
            console.log('');
        }

        // Coleta TODOS os profissionais desse banco (para visão geral)
        const resTodos = await rodarQuery(
            dbPath,
            `SELECT id, nome, email, ativo, empresa_id FROM profissionais`,
            []
        );
        if (resTodos.rows && resTodos.rows.length > 0) {
            for (const p of resTodos.rows) {
                todosProfissionais.push({ arquivo: arq, ...p });
            }
        }
    }

    // 3. Resumo
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RESUMO');
    console.log('═══════════════════════════════════════════════\n');

    if (achouEmUsuarios) {
        console.log(`✅ "${EMAIL_BUSCA}" está em USUARIOS (banco: ${achouEmUsuarios.arquivo})`);
        console.log(`   Role: ${achouEmUsuarios.role}, Empresa: ${achouEmUsuarios.empresa_id}`);
    } else {
        console.log(`❌ "${EMAIL_BUSCA}" NÃO está em USUARIOS em nenhum banco`);
    }

    if (achouEmProfissionais) {
        console.log(`\n✅ "${EMAIL_BUSCA}" está em PROFISSIONAIS (banco: ${achouEmProfissionais.arquivo})`);
        console.log(`   ID: ${achouEmProfissionais.id}, Ativo: ${achouEmProfissionais.ativo}, Empresa: ${achouEmProfissionais.empresa_id}`);
        console.log(`   Senha (início): ${achouEmProfissionais.senha_preview}...`);
        console.log(`   Tipo da senha: ${achouEmProfissionais.senha_preview.startsWith('$2') ? '✅ bcrypt' : '❌ NÃO é bcrypt'}`);
    } else {
        console.log(`\n❌ "${EMAIL_BUSCA}" NÃO está em PROFISSIONAIS em nenhum banco`);
    }

    // 4. Lista TODOS os profissionais de TODOS os bancos
    console.log('\n═══════════════════════════════════════════════');
    console.log(`📋 TODOS os profissionais (${todosProfissionais.length})`);
    console.log('═══════════════════════════════════════════════\n');

    if (todosProfissionais.length === 0) {
        console.log('⚠️  Nenhum profissional cadastrado em nenhum banco!');
    } else {
        for (const p of todosProfissionais) {
            const status = p.ativo == 1 ? '🟢' : '🔴';
            console.log(`${status} [${p.arquivo}] ID ${p.id} | ${p.nome} | ${p.email} | empresa ${p.empresa_id} | ativo=${p.ativo}`);
        }
    }

    console.log('\n═══════════════════════════════════════════════');
}

main().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});