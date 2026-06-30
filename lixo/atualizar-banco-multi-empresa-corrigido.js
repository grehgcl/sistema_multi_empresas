// atualizar-banco-multi-empresa-corrigido.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Atualizando banco para multi-empresa...\n');

// Verificar e adicionar coluna nivel na tabela usuarios
db.run(`ALTER TABLE usuarios ADD COLUMN nivel INTEGER DEFAULT 2`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✅ Coluna nivel já existe');
        } else {
            console.log('⚠️ Erro ao adicionar nivel:', err.message);
        }
    } else {
        console.log('✅ Coluna nivel adicionada');
    }
});

// Adicionar coluna plano na tabela empresas
db.run(`ALTER TABLE empresas ADD COLUMN plano TEXT DEFAULT 'basico'`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✅ Coluna plano já existe');
        } else {
            console.log('⚠️ Erro ao adicionar plano:', err.message);
        }
    } else {
        console.log('✅ Coluna plano adicionada');
    }
});

// Aguardar as alterações
setTimeout(() => {
    // nivel 3 = Super Admin, nivel 2 = Dono da empresa, nivel 1 = Profissional
    db.run(`UPDATE usuarios SET nivel = 3 WHERE email = 'admin@barbearia.com'`, (err) => {
        if (err) console.log('Erro:', err);
        else console.log('✅ Super Admin configurado');
    });

    db.run(`UPDATE usuarios SET nivel = 2 WHERE role = 'admin' AND email != 'admin@barbearia.com'`, (err) => {
        if (err) console.log('Erro:', err);
        else console.log('✅ Donos de empresa configurados');
    });

    db.run(`UPDATE usuarios SET nivel = 1 WHERE role = 'barbeiro'`, (err) => {
        if (err) console.log('Erro:', err);
        else console.log('✅ Profissionais configurados');
    });

    // Criar empresas exemplo se não existirem
    db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (1, 'Barbearia Central', 'premium')`);
    db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (2, 'Barbearia Norte', 'basico')`);
    db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (3, 'Barbearia Sul', 'basico')`);
    console.log('✅ Empresas de exemplo criadas');

    // Criar dono para empresa 2
    const senhaHash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
            VALUES ('Dono Barbearia Norte', 'dono@norte.com', ?, 'admin', 2, 2, 0, 1)`, [senhaHash], (err) => {
        if (err) console.log('Erro ao criar dono:', err);
        else console.log('✅ Dono Barbearia Norte criado');
    });

    // Criar profissionais para empresa 2
    db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
            VALUES ('João Norte', 'joao@norte.com', ?, 'barbeiro', 1, 2, 40, 1)`, [senhaHash], (err) => {
        if (err) console.log('Erro ao criar João:', err);
        else console.log('✅ Profissional João Norte criado');
    });

    db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, nivel, empresa_id, comissao_percentual, ativo) 
            VALUES ('Pedro Norte', 'pedro@norte.com', ?, 'barbeiro', 1, 2, 35, 1)`, [senhaHash], (err) => {
        if (err) console.log('Erro ao criar Pedro:', err);
        else console.log('✅ Profissional Pedro Norte criado');
    });

    // Listar usuários finais
    setTimeout(() => {
        db.all("SELECT id, nome, email, role, nivel, empresa_id FROM usuarios", (err, users) => {
            if (err) {
                console.log('Erro ao listar:', err);
            } else {
                console.log('\n📋 USUÁRIOS DO SISTEMA:');
                console.log('------------------------------------------------');
                users.forEach(u => {
                    let nivelNome = '';
                    if (u.nivel === 3) nivelNome = '🔴 Super Admin';
                    else if (u.nivel === 2) nivelNome = '🟠 Dono';
                    else if (u.nivel === 1) nivelNome = '🟢 Profissional';
                    else nivelNome = '⚪ Desconhecido';
                    
                    console.log(`${u.id} | ${u.nome} | ${u.email} | ${nivelNome} | Empresa: ${u.empresa_id || 'Todas'}`);
                });
            }
            console.log('\n✅ Banco atualizado com sucesso!');
            db.close();
        });
    }, 500);
}, 500);
