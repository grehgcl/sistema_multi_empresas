// scripts/corrigir-financeiro.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('🔧 CORRIGINDO FINANCEIRO - USAR BANCO DA EMPRESA');
console.log('============================================================\n');

// 1. VERIFICAR RECEITAS NO BANCO DA EMPRESA 5
console.log('📋 Verificando receitas no empresa_5.db...\n');

const db = new sqlite3.Database('database/empresa_5.db');
const mes = '08';
const ano = '2026';

db.all(`
    SELECT a.id, a.data, a.hora, a.servico, a.valor, a.forma_pagamento, a.status,
           c.nome as cliente_nome
    FROM agendamentos a
    LEFT JOIN clientes c ON a.cliente_id = c.id
    WHERE a.empresa_id = 5
      AND a.status = 'concluido'
      AND strftime('%m', a.data) = ?
      AND strftime('%Y', a.data) = ?
    ORDER BY a.data DESC
`, [mes, ano], (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('⚠️ Nenhuma receita encontrada no banco empresa_5.db');
        console.log('   Crie um agendamento e conclua com pagamento primeiro.');
        db.close();
        return;
    }

    console.log(`✅ ${rows.length} receitas encontradas no banco:\n`);
    rows.forEach(r => {
        console.log(`   ID: ${r.id}`);
        console.log(`   Data: ${r.data}`);
        console.log(`   Hora: ${r.hora}`);
        console.log(`   Cliente: ${r.cliente_nome || 'N/A'}`);
        console.log(`   Serviço: ${r.servico}`);
        console.log(`   Valor: R$ ${r.valor}`);
        console.log(`   Pagamento: ${r.forma_pagamento || 'N/A'}`);
        console.log(`   Status: ${r.status}`);
        console.log('   ---');
    });

    console.log('\n✅ Os dados estão no banco correto!');
    console.log('   Se não aparecer no financeiro, o problema é na rota.');
    db.close();
});

// 2. CORRIGIR A ROTA DO FINANCEIRO
console.log('\n🔧 Verificando arquivo de rotas do financeiro...');

const financeiroPath = path.join(__dirname, '../server/routes/financeiro.routes.js');

if (!fs.existsSync(financeiroPath)) {
    console.log('❌ Arquivo financeiro.routes.js não encontrado');
    process.exit(1);
}

let content = fs.readFileSync(financeiroPath, 'utf8');
let modified = false;

// Verificar se getEmpresaDb está importado
if (content.includes("const { db } = require('../config/database')") &&
    !content.includes('getEmpresaDb')) {
    content = content.replace(
        "const { db } = require('../config/database')",
        "const { db, getEmpresaDb } = require('../config/database')"
    );
    modified = true;
    console.log('✅ getEmpresaDb adicionado ao import');
}

// Verificar se a rota de receitas usa empresaDb
if (content.includes('router.get(\'/receitas\'') && !content.includes('empresaDb')) {
    // Adicionar empresaDb na rota
    content = content.replace(
        /(router\.get\s*\(\s*['"]\/receitas['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g,
        '$1\n    const empresaId = req.usuario.empresa_id;\n    const empresaDb = getEmpresaDb(empresaId);'
    );
    modified = true;
    console.log('✅ empresaDb adicionado na rota /receitas');
}

// Substituir db.all por empresaDb.all na rota de receitas
if (content.includes('db.all(') && content.includes('empresaDb')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('db.all(') &&
            (lines[i].includes('agendamentos') || lines[i].includes('receitas'))) {
            lines[i] = lines[i].replace('db.all(', 'empresaDb.all(');
        }
    }
    content = lines.join('\n');
    modified = true;
    console.log('✅ db.all substituído por empresaDb.all');
}

if (modified) {
    fs.writeFileSync(financeiroPath, content, 'utf8');
    console.log('✅ financeiro.routes.js corrigido!');
} else {
    console.log('⏭️ Nenhuma modificação necessária');
}

console.log('\n============================================================');
console.log('📝 Reinicie o servidor: npm start');
console.log('============================================================');