// migrate-telefone-dono.js
const { db } = require('./server/config/database');

async function migrar() {
    console.log('🔍 Iniciando migração de telefone_dono...');

    // Verificar se a coluna já existe
    db.all("PRAGMA table_info(empresas)", [], (err, columns) => {
        if (err) {
            console.error('❌ Erro ao verificar colunas:', err.message);
            return;
        }

        const existeTelefone = columns.some(col => col.name === 'telefone_dono');
        const existeEndereco = columns.some(col => col.name === 'endereco');

        // Adicionar coluna telefone_dono se não existir
        if (!existeTelefone) {
            console.log('📝 Adicionando coluna telefone_dono...');
            db.run(`ALTER TABLE empresas ADD COLUMN telefone_dono VARCHAR(20)`, [], (err) => {
                if (err) {
                    console.error('❌ Erro ao adicionar telefone_dono:', err.message);
                } else {
                    console.log('✅ Coluna telefone_dono criada!');
                }
            });
        } else {
            console.log('✅ Coluna telefone_dono já existe!');
        }

        // Adicionar coluna endereco se não existir
        if (!existeEndereco) {
            console.log('📝 Adicionando coluna endereco...');
            db.run(`ALTER TABLE empresas ADD COLUMN endereco TEXT`, [], (err) => {
                if (err) {
                    console.error('❌ Erro ao adicionar endereco:', err.message);
                } else {
                    console.log('✅ Coluna endereco criada!');
                }
            });
        } else {
            console.log('✅ Coluna endereco já existe!');
        }

        // Atualizar telefone do dono da empresa ID 3
        console.log('📝 Atualizando telefone do dono da empresa 3...');
        db.run(
            `UPDATE empresas SET telefone_dono = '41997391855' WHERE id = 3`,
            [],
            function (err) {
                if (err) {
                    console.error('❌ Erro ao atualizar telefone:', err.message);
                } else {
                    console.log(`✅ Telefone do dono atualizado! (${this.changes || 0} registros)`);
                }
            }
        );

        // Verificar resultado
        setTimeout(() => {
            db.get(`SELECT id, nome, telefone_dono, endereco FROM empresas WHERE id = 3`, [], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar:', err.message);
                } else {
                    console.log('📋 Dados da empresa 3:');
                    console.log(`   ID: ${row?.id}`);
                    console.log(`   Nome: ${row?.nome}`);
                    console.log(`   Telefone Dono: ${row?.telefone_dono || 'NÃO DEFINIDO'}`);
                    console.log(`   Endereco: ${row?.endereco || 'NÃO DEFINIDO'}`);
                }
                console.log('✅ Migração concluída!');
            });
        }, 1000);
    });
}

// Executar migração
migrar();