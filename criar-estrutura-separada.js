// criar-estrutura-separada.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🏗️ Criando estrutura separada por empresa...\n');

const senhaHash = bcrypt.hashSync('admin123', 10);

// 1. EMPRESAS
const empresas = [
    { id: 1, nome: 'Barbearia Central', plano: 'premium' },
    { id: 2, nome: 'Barbearia Norte', plano: 'basico' },
    { id: 3, nome: 'Barbearia Sul', plano: 'basico' }
];

empresas.forEach(emp => {
    db.run(`INSERT OR REPLACE INTO empresas (id, nome, plano) VALUES (?, ?, ?)`,
        [emp.id, emp.nome, emp.plano]);
});
console.log('✅ 3 empresas criadas');

// 2. SUPER ADMIN (nível 3 - vê tudo)
db.run(`INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, nivel, empresa_id) 
        VALUES (1, 'Super Admin', 'admin@barbearia.com', ?, 'admin', 3, NULL)`, [senhaHash]);
console.log('✅ Super Admin criado');

// 3. DONO DA EMPRESA 1 (Barbearia Central)
db.run(`INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, nivel, empresa_id) 
        VALUES (2, 'Dono Central', 'dono@central.com', ?, 'admin', 2, 1)`, [senhaHash]);

// 4. DONO DA EMPRESA 2 (Barbearia Norte)
db.run(`INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, nivel, empresa_id) 
        VALUES (3, 'Dono Norte', 'dono@norte.com', ?, 'admin', 2, 2)`, [senhaHash]);

// 5. DONO DA EMPRESA 3 (Barbearia Sul)
db.run(`INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, nivel, empresa_id) 
        VALUES (4, 'Dono Sul', 'dono@sul.com', ?, 'admin', 2, 3)`, [senhaHash]);
console.log('✅ 3 Donos criados');

// 6. SERVIÇOS SEPARADOS POR EMPRESA
const servicosPorEmpresa = {
    1: [
        { nome: 'Corte Premium', preco: 80, duracao: 40 },
        { nome: 'Barba Premium', preco: 50, duracao: 25 },
        { nome: 'Completo Premium', preco: 120, duracao: 60 }
    ],
    2: [
        { nome: 'Corte Simples', preco: 40, duracao: 30 },
        { nome: 'Barba Simples', preco: 25, duracao: 20 },
        { nome: 'Corte + Barba', preco: 55, duracao: 50 }
    ],
    3: [
        { nome: 'Corte Executivo', preco: 50, duracao: 35 },
        { nome: 'Barba Executiva', preco: 35, duracao: 25 },
        { nome: 'Pacote Completo', preco: 75, duracao: 55 }
    ]
};

for (let empresaId in servicosPorEmpresa) {
    servicosPorEmpresa[empresaId].forEach(serv => {
        db.run(`INSERT INTO servicos (nome, preco, duracao, empresa_id) VALUES (?, ?, ?, ?)`,
            [serv.nome, serv.preco, serv.duracao, empresaId]);
    });
}
console.log('✅ Serviços criados separadamente por empresa');

// 7. PROFISSIONAIS POR EMPRESA
const profissionaisPorEmpresa = {
    1: [
        { nome: 'Carlos Mestre', email: 'carlos@central.com', comissao: 45 },
        { nome: 'Ricardo Especialista', email: 'ricardo@central.com', comissao: 40 }
    ],
    2: [
        { nome: 'João Silva', email: 'joao@norte.com', comissao: 35 },
        { nome: 'Pedro Souza', email: 'pedro@norte.com', comissao: 30 }
    ],
    3: [
        { nome: 'André Lima', email: 'andre@sul.com', comissao: 40 },
        { nome: 'Marcos Costa', email: 'marcos@sul.com', comissao: 35 }
    ]
};

for (let empresaId in profissionaisPorEmpresa) {
    profissionaisPorEmpresa[empresaId].forEach(prof => {
        db.run(`INSERT INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
                VALUES (?, ?, ?, 'barbeiro', 1, ?, ?, 1)`,
            [prof.nome, prof.email, senhaHash, empresaId, prof.comissao]);
    });
}
console.log('✅ Profissionais criados separadamente por empresa');

// 8. CLIENTES POR EMPRESA
const clientesPorEmpresa = {
    1: [
        { nome: 'Cliente VIP 1', telefone: '(11) 99999-0001', email: 'vip1@email.com' },
        { nome: 'Cliente VIP 2', telefone: '(11) 99999-0002', email: 'vip2@email.com' }
    ],
    2: [
        { nome: 'Cliente Norte 1', telefone: '(11) 99999-0003', email: 'norte1@email.com' },
        { nome: 'Cliente Norte 2', telefone: '(11) 99999-0004', email: 'norte2@email.com' }
    ],
    3: [
        { nome: 'Cliente Sul 1', telefone: '(11) 99999-0005', email: 'sul1@email.com' },
        { nome: 'Cliente Sul 2', telefone: '(11) 99999-0006', email: 'sul2@email.com' }
    ]
};

for (let empresaId in clientesPorEmpresa) {
    clientesPorEmpresa[empresaId].forEach(cliente => {
        db.run(`INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`,
            [cliente.nome, cliente.telefone, cliente.email, empresaId]);
    });
}
console.log('✅ Clientes criados separadamente por empresa');

// 9. AGENDAMENTOS DE EXEMPLO (para cada empresa)
const agendamentosExemplo = [
    { empresa: 1, barbeiro: 'Carlos Mestre', cliente: 'Cliente VIP 1', servico: 'Corte Premium', data: '2026-06-12', hora: '10:00' },
    { empresa: 1, barbeiro: 'Ricardo Especialista', cliente: 'Cliente VIP 2', servico: 'Barba Premium', data: '2026-06-12', hora: '14:00' },
    { empresa: 2, barbeiro: 'João Silva', cliente: 'Cliente Norte 1', servico: 'Corte Simples', data: '2026-06-12', hora: '09:00' },
    { empresa: 2, barbeiro: 'Pedro Souza', cliente: 'Cliente Norte 2', servico: 'Corte + Barba', data: '2026-06-13', hora: '15:00' },
    { empresa: 3, barbeiro: 'André Lima', cliente: 'Cliente Sul 1', servico: 'Corte Executivo', data: '2026-06-12', hora: '11:00' },
    { empresa: 3, barbeiro: 'Marcos Costa', cliente: 'Cliente Sul 2', servico: 'Barba Executiva', data: '2026-06-13', hora: '16:00' }
];

// Buscar IDs e inserir agendamentos
function inserirAgendamentos() {
    let inseridos = 0;
    
    for (let ag of agendamentosExemplo) {
        db.get(`SELECT id FROM usuarios WHERE nome = ? AND empresa_id = ?`, [ag.barbeiro, ag.empresa], (err, barbeiro) => {
            if (barbeiro) {
                db.get(`SELECT id FROM clientes WHERE nome = ? AND empresa_id = ?`, [ag.cliente, ag.empresa], (err, cliente) => {
                    if (cliente) {
                        db.get(`SELECT id, preco FROM servicos WHERE nome = ? AND empresa_id = ?`, [ag.servico, ag.empresa], (err, servico) => {
                            if (servico) {
                                db.run(`INSERT INTO agendamentos (cliente_id, barbeiro_id, servico_id, data, hora, valor_total, status, empresa_id) 
                                        VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)`,
                                    [cliente.id, barbeiro.id, servico.id, ag.data, ag.hora, servico.preco, ag.empresa], () => {
                                        inseridos++;
                                        if (inseridos === agendamentosExemplo.length) {
                                            console.log('✅ Agendamentos de exemplo criados');
                                            mostrarResumo();
                                        }
                                    });
                            }
                        });
                    }
                });
            }
        });
    }
}

function mostrarResumo() {
    console.log('\n📊 RESUMO FINAL:');
    console.log('========================================');
    
    db.all(`SELECT id, nome, plano FROM empresas`, (err, empresas) => {
        empresas.forEach(emp => {
            console.log(`\n🏢 ${emp.nome} (${emp.plano}):`);
            
            db.get(`SELECT COUNT(*) as total FROM servicos WHERE empresa_id = ?`, [emp.id], (err, serv) => {
                console.log(`   📋 Serviços: ${serv.total}`);
            });
            
            db.get(`SELECT COUNT(*) as total FROM clientes WHERE empresa_id = ?`, [emp.id], (err, cli) => {
                console.log(`   👥 Clientes: ${cli.total}`);
            });
            
            db.get(`SELECT COUNT(*) as total FROM usuarios WHERE empresa_id = ? AND role = 'barbeiro'`, [emp.id], (err, prof) => {
                console.log(`   ✂️ Profissionais: ${prof.total}`);
            });
            
            db.get(`SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?`, [emp.id], (err, ag) => {
                console.log(`   📅 Agendamentos: ${ag.total}`);
            });
        });
        
        console.log('\n✅ Estrutura criada com sucesso!');
        db.close();
    });
}

// Executar inserção após um pequeno delay
setTimeout(() => {
    inserirAgendamentos();
}, 500);
