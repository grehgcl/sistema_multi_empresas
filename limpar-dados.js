// limpar-dados.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🗑️ Limpando todos os dados...\n');

// Deletar todos os registros
db.run('DELETE FROM comissoes', () => console.log('✅ Comissões removidas'));
db.run('DELETE FROM agendamentos', () => console.log('✅ Agendamentos removidos'));
db.run('DELETE FROM servicos', () => console.log('✅ Serviços removidos'));
db.run('DELETE FROM clientes', () => console.log('✅ Clientes removidos'));
db.run('DELETE FROM usuarios WHERE role = "barbeiro"', () => console.log('✅ Profissionais removidos'));
db.run('DELETE FROM usuarios WHERE role = "admin" AND email != "admin@barbearia.com"', () => console.log('✅ Donos removidos'));
db.run('DELETE FROM empresas WHERE id > 1', () => console.log('✅ Empresas extras removidas'));

// Resetar sequencias
db.run('DELETE FROM sqlite_sequence', () => {
    console.log('\n✅ Todos os dados foram limpos!');
    db.close();
});
