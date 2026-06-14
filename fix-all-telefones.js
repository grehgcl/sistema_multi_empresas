const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('Corrigindo formatos de telefone no banco de dados...');

function limparTelefone(telefone) {
    if (!telefone) return null;
    return telefone.replace(/\D/g, '');
}

db.all('SELECT id, nome, telefone FROM clientes', (err, clientes) => {
    if (err) {
        console.error('Erro:', err);
        db.close();
        return;
    }

    console.log('Clientes encontrados:', clientes.length);
    console.log('');

    let atualizados = 0;
    let contador = 0;

    clientes.forEach(cliente => {
        contador++;
        const telefoneLimpo = limparTelefone(cliente.telefone);

        console.log('Cliente ' + contador + ': ' + cliente.nome);
        console.log('  Telefone atual: ' + cliente.telefone);
        console.log('  Telefone limpo: ' + telefoneLimpo);

        if (telefoneLimpo && cliente.telefone !== telefoneLimpo) {
            db.run('UPDATE clientes SET telefone = ? WHERE id = ?',
                [telefoneLimpo, cliente.id], (err) => {
                    if (err) {
                        console.log('  Erro ao atualizar:', err.message);
                    } else {
                        atualizados++;
                        console.log('  Atualizado para: ' + telefoneLimpo);
                    }
                    console.log('');
                });
        } else if (telefoneLimpo) {
            console.log('  Telefone ja esta correto: ' + telefoneLimpo);
            console.log('');
        } else {
            console.log('  Telefone vazio ou invalido');
            console.log('');
        }
    });

    setTimeout(() => {
        console.log('');
        console.log('RESUMO:');
        console.log('Atualizados: ' + atualizados);
        console.log('Total processados: ' + contador);
        console.log('');
        console.log('Correcao concluida!');
        db.close();
    }, 3000);
});