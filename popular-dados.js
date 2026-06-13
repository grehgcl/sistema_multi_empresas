const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Inserindo dados de exemplo...\n');

// Inserir clientes
const clientes = [
    { nome: 'João Silva', telefone: '(11) 99999-1111', email: 'joao@email.com' },
    { nome: 'Maria Santos', telefone: '(11) 99999-2222', email: 'maria@email.com' },
    { nome: 'Carlos Oliveira', telefone: '(11) 99999-3333', email: 'carlos@email.com' },
    { nome: 'Ana Paula', telefone: '(11) 99999-4444', email: 'ana@email.com' },
    { nome: 'Roberto Souza', telefone: '(11) 99999-5555', email: 'roberto@email.com' }
];

clientes.forEach(cliente => {
    db.run(`INSERT OR IGNORE INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`,
        [cliente.nome, cliente.telefone, cliente.email, 1]);
});

console.log(`✅ Inseridos ${clientes.length} clientes`);

// Inserir serviços
const servicos = [
    { nome: 'Corte de Cabelo', preco: 40, duracao: 30 },
    { nome: 'Barba', preco: 30, duracao: 20 },
    { nome: 'Corte + Barba', preco: 60, duracao: 50 },
    { nome: 'Pezinho', preco: 25, duracao: 15 },
    { nome: 'Progressiva', preco: 120, duracao: 90 },
    { nome: 'Platinado', preco: 200, duracao: 120 },
    { nome: 'Hidratação', preco: 50, duracao: 40 },
    { nome: 'Sobrancelha', preco: 20, duracao: 15 }
];

servicos.forEach(servico => {
    db.run(`INSERT OR IGNORE INTO servicos (nome, preco, duracao, empresa_id) VALUES (?, ?, ?, ?)`,
        [servico.nome, servico.preco, servico.duracao, 1]);
});

console.log(`✅ Inseridos ${servicos.length} serviços`);

// Inserir barbeiros se não existirem
const barbeiros = [
    { nome: 'Carlos Barbeiro', email: 'carlos@barbeiro.com', senha: '123456', comissao: 40 },
    { nome: 'Rafael Souza', email: 'rafael@barbeiro.com', senha: '123456', comissao: 35 },
    { nome: 'Fernando Lima', email: 'fernando@barbeiro.com', senha: '123456', comissao: 45 }
];

barbeiros.forEach(barbeiro => {
    const senhaHash = bcrypt.hashSync(barbeiro.senha, 10);
    db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, comissao_percentual, empresa_id, ativo) 
            VALUES (?, ?, ?, 'barbeiro', ?, 1, 1)`,
        [barbeiro.nome, barbeiro.email, senhaHash, barbeiro.comissao]);
});

console.log(`✅ Inseridos ${barbeiros.length} barbeiros`);

// Verificar dados inseridos
console.log('\n📊 RESULTADO:');

db.get('SELECT COUNT(*) as total FROM clientes WHERE empresa_id = 1', (err, result) => {
    console.log(`   Clientes: ${result?.total || 0}`);
});

db.get('SELECT COUNT(*) as total FROM servicos WHERE empresa_id = 1', (err, result) => {
    console.log(`   Serviços: ${result?.total || 0}`);
});

db.get("SELECT COUNT(*) as total FROM usuarios WHERE role = 'barbeiro' AND empresa_id = 1", (err, result) => {
    console.log(`   Barbeiros: ${result?.total || 0}`);
    console.log('\n✅ Dados inseridos com sucesso!');
    db.close();
});
