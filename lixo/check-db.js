// check-db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔍 Verificando banco de dados...\n');

// 1. Verificar empresas
db.all("SELECT * FROM empresas", (err, empresas) => {
    if (err) {
        console.log('❌ Erro ao buscar empresas:', err.message);
    } else {
        console.log('📊 EMPRESAS:');
        empresas.forEach(emp => {
            console.log(`   ID: ${emp.id} | Nome: ${emp.nome} | Plano: ${emp.plano} | Trial: ${emp.trial_expira}`);
        });
        console.log('');
    }
});

// 2. Verificar clientes
db.all("SELECT * FROM clientes", (err, clientes) => {
    if (err) {
        console.log('❌ Erro ao buscar clientes:', err.message);
    } else {
        console.log('📊 CLIENTES:');
        if (clientes.length === 0) {
            console.log('   Nenhum cliente cadastrado');
        } else {
            clientes.forEach(c => {
                console.log(`   ID: ${c.id} | Nome: ${c.nome} | Telefone: ${c.telefone} | Empresa: ${c.empresa_id}`);
            });
        }
        console.log('');
    }
});

// 3. Verificar estrutura da tabela clientes
db.all("PRAGMA table_info(clientes)", (err, columns) => {
    if (err) {
        console.log('❌ Erro ao verificar colunas:', err.message);
    } else {
        console.log('📊 ESTRUTURA DA TABELA CLIENTES:');
        columns.forEach(col => {
            console.log(`   ${col.name} (${col.type})`);
        });
        console.log('');
    }
});

// 4. Verificar se a coluna bloqueado_chatbot existe e adicionar se não existir
db.run(`ALTER TABLE clientes ADD COLUMN bloqueado_chatbot INTEGER DEFAULT 0`, (err) => {
    if (err && err.message.includes('duplicate column name')) {
        console.log('✅ Coluna bloqueado_chatbot já existe');
    } else if (err) {
        console.log('⚠️ Erro ao adicionar coluna:', err.message);
    } else {
        console.log('✅ Coluna bloqueado_chatbot adicionada com sucesso!');
    }
});

// 5. Inserir um cliente de teste
setTimeout(() => {
    console.log('\n📝 Inserindo cliente de teste...');

    // Pegar o primeiro empresa_id
    db.get("SELECT id FROM empresas LIMIT 1", (err, empresa) => {
        if (err || !empresa) {
            console.log('❌ Nenhuma empresa encontrada. Cadastre uma barbearia primeiro!');
            db.close();
            return;
        }

        const empresaId = empresa.id;
        console.log(`   Usando empresa_id: ${empresaId}`);

        db.run(`INSERT OR IGNORE INTO clientes (nome, telefone, email, empresa_id) 
                VALUES ('Cliente Teste Node', '11999999999', 'teste@node.com', ?)`,
            [empresaId], function (err) {
                if (err) {
                    console.log('❌ Erro ao inserir cliente:', err.message);
                } else {
                    if (this.changes > 0) {
                        console.log('✅ Cliente de teste inserido com sucesso!');
                    } else {
                        console.log('⚠️ Cliente já existe ou não foi inserido');
                    }
                }

                // Verificar novamente os clientes
                db.all("SELECT * FROM clientes", (err, clientes) => {
                    console.log('\n📊 CLIENTES ATUALIZADO:');
                    if (clientes && clientes.length > 0) {
                        clientes.forEach(c => {
                            console.log(`   ID: ${c.id} | Nome: ${c.nome} | Telefone: ${c.telefone}`);
                        });
                    } else {
                        console.log('   Nenhum cliente encontrado');
                    }

                    db.close();
                    console.log('\n✅ Verificação concluída!');
                });
            });
    });
}, 500);