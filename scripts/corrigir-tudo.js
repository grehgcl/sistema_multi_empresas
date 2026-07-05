const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO TODOS OS ARQUIVOS PARA POSTGRESQL...');
console.log('='.repeat(60));

// ============================================
// FUNÇÃO QUE VAI SER ADICIONADA EM TODOS OS ARQUIVOS
// ============================================
const funcaoUtil = `
// ============================================
// FUNÇÕES DE COMPATIBILIDADE POSTGRESQL
// ============================================

// Converter aberto (true/false ou 1/0)
function isAberto(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

// Converter ativo (true/false ou 1/0)
function isAtivo(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

// Converter valor para número
function toNumber(valor) {
    return parseFloat(valor) || 0;
}

// Formatar moeda
function formatMoney(valor) {
    return toNumber(valor).toFixed(2).replace('.', ',');
}
`;

// Lista de arquivos para corrigir
const arquivosParaCorrigir = [
    'configuracoes.js',
    'dashboard.js',
    'agendamentos.js',
    'servicos.js',
    'financeiro.js',
    'clientes.js',
    'dashboard-profissional.js',
    'agendamentos-profissional.js'
];

const pastaPages = path.join(__dirname, '../public/js/pages');
let totalCorrigidos = 0;

arquivosParaCorrigir.forEach(arquivo => {
    const filePath = path.join(pastaPages, arquivo);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${arquivo}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modificado = false;

    // 1. Adicionar as funções se não existirem
    if (!content.includes('function isAberto')) {
        // Adicionar depois do primeiro import ou no início
        content = funcaoUtil + '\n' + content;
        modificado = true;
        console.log(`✅ ${arquivo}: funções adicionadas`);
    }

    // 2. Corrigir .aberto
    if (content.includes('.aberto === 1')) {
        content = content.replace(/\.aberto === 1/g, '.aberto === true || .aberto === 1');
        modificado = true;
        console.log(`   ${arquivo}: corrigido .aberto === 1`);
    }
    if (content.includes('.aberto =')) {
        content = content.replace(/\.aberto = (\d)/g, (match, num) => {
            if (num === '1') return '.aberto = true';
            if (num === '0') return '.aberto = false';
            return match;
        });
        modificado = true;
        console.log(`   ${arquivo}: corrigido .aberto =`);
    }

    // 3. Corrigir .ativo
    if (content.includes('.ativo === 1')) {
        content = content.replace(/\.ativo === 1/g, '.ativo === true || .ativo === 1');
        modificado = true;
        console.log(`   ${arquivo}: corrigido .ativo === 1`);
    }
    if (content.includes('.ativo =')) {
        content = content.replace(/\.ativo = (\d)/g, (match, num) => {
            if (num === '1') return '.ativo = true';
            if (num === '0') return '.ativo = false';
            return match;
        });
        modificado = true;
        console.log(`   ${arquivo}: corrigido .ativo =`);
    }

    // 4. Corrigir .status
    if (content.includes('.status === 1')) {
        content = content.replace(/\.status === 1/g, '.status === true || .status === 1');
        modificado = true;
        console.log(`   ${arquivo}: corrigido .status === 1`);
    }

    // 5. Corrigir .toFixed
    if (content.includes('.toFixed')) {
        // Substituir (x || 0).toFixed por (parseFloat(x) || 0).toFixed
        content = content.replace(/\((\w+)\s*\|\|\s*0\)\.toFixed/g, '(parseFloat($1) || 0).toFixed');
        content = content.replace(/\((\w+\.\w+)\s*\|\|\s*0\)\.toFixed/g, '(parseFloat($1) || 0).toFixed');
        modificado = true;
        console.log(`   ${arquivo}: corrigido .toFixed`);
    }

    // 6. Usar formatMoney onde possível
    if (content.includes('R$ ') && content.includes('.toFixed')) {
        // Não substituímos automaticamente para não quebrar
        console.log(`   ${arquivo}: tem formatação de moeda (verificar manualmente se necessário)`);
    }

    if (modificado) {
        fs.writeFileSync(filePath, content);
        totalCorrigidos++;
        console.log(`📝 ${arquivo} salvo!`);
    } else {
        console.log(`⏭️ ${arquivo}: nenhuma alteração necessária`);
    }
    console.log('');
});

console.log('='.repeat(60));
console.log(`✅ ${totalCorrigidos} arquivos corrigidos!`);
console.log('');
console.log('📝 PRÓXIMOS PASSOS:');
console.log('1. git add public/js/pages/*.js');
console.log('2. git commit -m "fix: compatibilidade PostgreSQL (aberto, ativo, toFixed)"');
console.log('3. git push origin main');