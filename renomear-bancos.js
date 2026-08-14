// renomear-bancos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('database/barbearia.db');

// Buscar todas as empresas
db.all('SELECT id, nome FROM empresas ORDER BY id', (err, empresas) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log(`📋 Encontradas ${empresas.length} empresas\n`);
    console.log('🔄 RENOMEANDO BANCOS...\n');

    let renomeados = 0;
    let erros = 0;

    for (const empresa of empresas) {
        const id = empresa.id;
        const nome = empresa.nome || `Empresa_${id}`;

        // Nome antigo: empresa_X.db
        const nomeAntigo = `empresa_${id}.db`;
        const caminhoAntigo = path.join(__dirname, 'database', nomeAntigo);

        // Nome novo: Nome_da_Empresa_ID.db
        const nomeNovo = gerarNomeArquivo(nome, id);
        const caminhoNovo = path.join(__dirname, 'database', `${nomeNovo}.db`);

        // Verificar se o banco antigo existe
        if (!fs.existsSync(caminhoAntigo)) {
            console.log(`⚠️ Banco não encontrado: ${nomeAntigo}`);
            continue;
        }

        // Se o novo já existe, pular
        if (fs.existsSync(caminhoNovo)) {
            console.log(`⚠️ Banco já existe com nome novo: ${nomeNovo}.db`);
            continue;
        }

        // Renomear
        try {
            fs.renameSync(caminhoAntigo, caminhoNovo);
            console.log(`✅ ${nomeAntigo} → ${nomeNovo}.db`);
            renomeados++;
        } catch (error) {
            console.error(`❌ Erro ao renomear ${nomeAntigo}:`, error.message);
            erros++;
        }
    }

    console.log(`\n📊 RESULTADO:`);
    console.log(`   Renomeados: ${renomeados}`);
    console.log(`   Erros: ${erros}`);

    db.close();
});

// ============================================
// FUNÇÃO AUXILIAR
// ============================================
function gerarNomeArquivo(nomeEmpresa, empresaId) {
    let nome = nomeEmpresa
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    if (!nome || nome.length < 2) {
        nome = `empresa`;
    }

    return `${nome}_${empresaId}`;
}