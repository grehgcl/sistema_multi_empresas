// atualizar-banco-multi-empresa.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Atualizando banco para multi-empresa...\n');

// Adicionar coluna role_nivel na tabela usuarios se não existir
db.run(`ALTER TABLE usuarios ADD COLUMN nivel INTEGER DEFAULT 2`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.log('⚠️ Coluna nivel pode já existir');
    } else {
        console.log('✅ Coluna nivel adicionada');
    }
});

// Adicionar coluna plano na tabela empresas
db.run(`ALTER TABLE empresas ADD COLUMN plano TEXT DEFAULT 'basico'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.log('⚠️ Coluna plano pode já existir');
    } else {
        console.log('✅ Coluna plano adicionada');
    }
});

// Atualizar níveis dos usuários
// nivel 3 = Super Admin, nivel 2 = Dono da empresa, nivel 1 = Profissional
db.run(`UPDATE usuarios SET nivel = 3 WHERE email = 'admin@barbearia.com'`, () => {
    console.log('✅ Super Admin configurado');
});

db.run(`UPDATE usuarios SET nivel = 2 WHERE role = 'admin' AND email != 'admin@barbearia.com'`, () => {
    console.log('✅ Donos de empresa configurados');
});

db.run(`UPDATE usuarios SET nivel = 1 WHERE role = 'barbeiro'`, () => {
    console.log('✅ Profissionais configurados');
});

// Criar empresa exemplo
db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (1, 'Barbearia Central', 'premium')`, () => {});
db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (2, 'Barbearia Norte', 'basico')`, () => {});
db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (3, 'Barbearia Sul', 'basico')`, () => {});

console.log('✅ Empresas de exemplo criadas');

// Criar dono para empresa 2
const senhaHash = bcrypt.hashSync('admin123', 10);
db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
        VALUES ('Dono Barbearia Norte', 'dono@norte.com', ?, 'admin', 2, 2, 0, 1)`, [senhaHash]);

// Criar profissionais para empresa 2
db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
        VALUES ('João Norte', 'joao@norte.com', ?, 'barbeiro', 1, 2, 40, 1)`, [senhaHash]);

db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
        VALUES ('Pedro Norte', 'pedro@norte.com', ?, 'barbeiro', 1, 2, 35, 1)`, [senhaHash]);

console.log('✅ Donos e profissionais adicionados');

// Listar usuários finais
db.all("SELECT id, nome, email, role, nivel, empresa_id FROM usuarios", (err, users) => {
    console.log('\n📋 USUÁRIOS DO SISTEMA:');
    console.log('ID | Nome | Email | Role | Nível | Empresa');
    console.log('---|------|-------|------|-------|--------');
    users.forEach(u => {
        const nivelNome = u.nivel === 3 ? 'Super Admin' : (u.nivel === 2 ? 'Dono' : 'Profissional');
        console.log(`${u.id} | ${u.nome} | ${u.email} | ${u.role} | ${nivelNome} | ${u.empresa_id || 'Todas'}`);
    });
    
    db.close();
    console.log('\n✅ Banco atualizado com sucesso!');
});
