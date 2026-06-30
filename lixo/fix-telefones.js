const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Corrigindo formatos de telefone no banco de dados...');

// Função para limpar telefone
function limparTelefone(telefone) {
    if (!telefone) return null;
    // Remove tudo que não for número
    return telefone.replace(/\D/g, '');
}

// Buscar todos os clientes
db.all('SELECT id, nome, telefone FROM clientes', (err, clientes) => {
    if (err) {
        console.error('Erro:', err);
        db.close();
        return;
    }

    console.log(`📊 Encontrados ${clientes.length} clientes`);
    console.log('');

    let atualizados = 0;
    let contador = 0;

    clientes.forEach(cliente => {
        contador++;
        const telefoneLimpo = limparTelefone(cliente.telefone);

        console.log(`Cliente ${contador}: ${cliente.nome}`);
        console.log(`  Telefone atual: ${cliente.telefone}`);
        console.log(`  Telefone limpo: ${telefoneLimpo}`);

        if (telefoneLimpo && cliente.telefone !== telefoneLimpo) {
            db.run('UPDATE clientes SET telefone = ? WHERE id = ?',
                [telefoneLimpo, cliente.id], (err) => {
                    if (err) {
                        console.log(`  ❌ Erro ao atualizar:`, err.message);
                    } else {
                        atualizados++;
                        console.log(`  ✅ Atualizado para: ${telefoneLimpo}`);
                    }
                    console.log('');
                });
        } else if (telefoneLimpo) {
            console.log(`  ⚠️ Telefone já está correto: ${telefoneLimpo}`);
            console.log('');
        } else {
            console.log(`  ⚠️ Telefone vazio ou inválido`);
            console.log('');
        }
    });

    setTimeout(() => {
        console.log(`\n📋 RESUMO:`);
        console.log(`✅ Atualizados: ${atualizados}`);
        console.log(`📊 Total processados: ${contador}`);
        console.log(`\n🎉 Correção concluída!`);
        db.close();
    }, 3000);
});