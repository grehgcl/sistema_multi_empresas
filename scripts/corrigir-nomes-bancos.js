// corrigir-nomes-bancos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('🔄 CORRIGINDO NOMES DOS BANCOS');
console.log('========================================\n');

const dbDir = path.join(__dirname, 'database');

// Conectar ao banco principal
const db = new sqlite3.Database('database/barbearia.db');

// Buscar todas as empresas
db.all('SELECT id, nome FROM empresas WHERE id IS NOT NULL AND id != "null"', (err, empresas) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log(`📋 Encontradas ${empresas.length} empresas\n`);

    let renomeados = 0;
    let erros = 0;
    let ignorados = 0;

    for (const empresa of empresas) {
        const id = String(empresa.id);
        const nome = empresa.nome || `Empresa_${id}`;

        // Gerar nome limpo para o arquivo
        const nomeLimpo = nome
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')      // Remove acentos
            .replace(/[^a-zA-Z0-9]/g, '_')        // Substitui caracteres especiais
            .replace(/_+/g, '_')                  // Remove múltiplos _
            .replace(/^_|_$/g, '');               // Remove _ do início/fim

        // Nome final: NomeLimpo_ID.db
        const nomeNovo = `${nomeLimpo}_${id}.db`;
        const caminhoNovo = path.join(dbDir, nomeNovo);

        // Verificar se já existe um banco com esse nome
        if (fs.existsSync(caminhoNovo)) {
            console.log(`   ⏭️ ${id} - ${nome} → ${nomeNovo} (já existe)`);
            ignorados++;
            continue;
        }

        // Procurar o banco atual (qualquer formato)
        let bancoAntigo = null;
        const arquivos = fs.readdirSync(dbDir);

        // Procurar por empresa_X.db
        const caminhoPadrao = path.join(dbDir, `empresa_${id}.db`);
        if (fs.existsSync(caminhoPadrao)) {
            bancoAntigo = `empresa_${id}.db`;
        }

        // Procurar por Nome_ID.db (já no formato certo)
        if (!bancoAntigo) {
            for (const f of arquivos) {
                if (f.endsWith(`_${id}.db`) && f !== `empresa_${id}.db`) {
                    bancoAntigo = f;
                    break;
                }
            }
        }

        // Procurar por empresa_X_nome.db
        if (!bancoAntigo) {
            for (const f of arquivos) {
                if (f.startsWith(`empresa_${id}_`)) {
                    bancoAntigo = f;
                    break;
                }
            }
        }

        // Se não encontrou, pular
        if (!bancoAntigo) {
            console.log(`   ⚠️ ${id} - ${nome} → Banco não encontrado!`);
            erros++;
            continue;
        }

        // Renomear
        const caminhoAntigo = path.join(dbDir, bancoAntigo);
        try {
            fs.renameSync(caminhoAntigo, caminhoNovo);
            console.log(`   ✅ ${id} - ${nome}`);
            console.log(`      ${bancoAntigo} → ${nomeNovo}`);
            renomeados++;
        } catch (error) {
            console.error(`   ❌ ${id} - Erro ao renomear:`, error.message);
            erros++;
        }
    }

    console.log('\n========================================');
    console.log('📊 RESUMO:');
    console.log(`   ✅ Renomeados: ${renomeados}`);
    console.log(`   ⏭️ Ignorados: ${ignorados} (já no formato correto)`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log('========================================');

    // Verificar empresas com ID NULL
    db.get('SELECT COUNT(*) as total FROM empresas WHERE id IS NULL OR id = "null"', (err, row) => {
        if (row && row.total > 0) {
            console.log(`\n⚠️ ATENÇÃO: ${row.total} empresa(s) com ID NULL encontrada(s)!`);
            console.log('   Execute: node deletar-empresa-null.js para remover');
        }
        db.close();
    });
});