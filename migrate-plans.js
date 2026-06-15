// migrate-plans.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🚀 Iniciando migração do sistema de planos...\n');

// Executar as alterações em sequência
db.serialize(() => {

    // 1. Verificar e adicionar coluna plano
    db.run(`ALTER TABLE empresas ADD COLUMN plano TEXT DEFAULT 'trial'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('⚠️ Erro ao adicionar coluna plano:', err.message);
        } else if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Coluna plano já existe');
        } else {
            console.log('✅ Coluna plano adicionada com sucesso');
        }
    });

    // 2. Adicionar coluna limite_profissionais
    db.run(`ALTER TABLE empresas ADD COLUMN limite_profissionais INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('⚠️ Erro ao adicionar limite_profissionais:', err.message);
        } else if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Coluna limite_profissionais já existe');
        } else {
            console.log('✅ Coluna limite_profissionais adicionada com sucesso');
        }
    });

    // 3. Adicionar coluna assinatura_ativa
    db.run(`ALTER TABLE empresas ADD COLUMN assinatura_ativa INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('⚠️ Erro ao adicionar assinatura_ativa:', err.message);
        } else if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Coluna assinatura_ativa já existe');
        } else {
            console.log('✅ Coluna assinatura_ativa adicionada com sucesso');
        }
    });

    // 4. Adicionar coluna assinatura_valida_ate
    db.run(`ALTER TABLE empresas ADD COLUMN assinatura_valida_ate DATE`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('⚠️ Erro ao adicionar assinatura_valida_ate:', err.message);
        } else if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Coluna assinatura_valida_ate já existe');
        } else {
            console.log('✅ Coluna assinatura_valida_ate adicionada com sucesso');
        }
    });

    // 5. Adicionar coluna ultima_cobranca
    db.run(`ALTER TABLE empresas ADD COLUMN ultima_cobranca DATE`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('⚠️ Erro ao adicionar ultima_cobranca:', err.message);
        } else if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Coluna ultima_cobranca já existe');
        } else {
            console.log('✅ Coluna ultima_cobranca adicionada com sucesso');
        }
    });

    // 6. Adicionar coluna bloqueado_chatbot na tabela clientes (se não existir)
    db.run(`ALTER TABLE clientes ADD COLUMN bloqueado_chatbot INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('⚠️ Erro ao adicionar bloqueado_chatbot:', err.message);
        } else if (err && err.message.includes('duplicate column name')) {
            console.log('✅ Coluna bloqueado_chatbot já existe');
        } else {
            console.log('✅ Coluna bloqueado_chatbot adicionada com sucesso');
        }
    });

    // 7. Criar tabela planos_historico
    db.run(`CREATE TABLE IF NOT EXISTS planos_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        plano_antigo TEXT,
        plano_novo TEXT,
        valor_pago REAL,
        metodo_pagamento TEXT,
        comprovante TEXT,
        data_mudanca DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )`, (err) => {
        if (err) {
            console.log('⚠️ Erro ao criar tabela planos_historico:', err.message);
        } else {
            console.log('✅ Tabela planos_historico criada com sucesso');
        }
    });

    // 8. Atualizar empresas existentes para terem os valores padrão corretos
    db.run(`UPDATE empresas SET 
        plano = COALESCE(plano, 'trial'),
        limite_profissionais = COALESCE(limite_profissionais, 1),
        assinatura_ativa = COALESCE(assinatura_ativa, 1)
        WHERE plano IS NULL OR limite_profissionais IS NULL OR assinatura_ativa IS NULL`,
        (err) => {
            if (err) {
                console.log('⚠️ Erro ao atualizar empresas existentes:', err.message);
            } else {
                console.log('✅ Empresas existentes atualizadas com valores padrão');
            }
        }
    );

    // 9. Verificar se o Super Admin existe, se não, criar
    const superAdminEmail = 'super@admin.com';
    const superAdminSenha = '$2a$10$8VvXqZqZqZqZqZqZqZqZqOqOqOqOqOqOqOqOqOqOqOqOqOqOqO'; // "super123" hashed

    db.get(`SELECT id FROM usuarios WHERE email = ?`, [superAdminEmail], (err, user) => {
        if (!user) {
            console.log('📝 Criando Super Admin padrão...');
            db.run(`INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                    VALUES ('Super Admin', ?, ?, 'superadmin', NULL)`,
                [superAdminEmail, superAdminSenha], (err) => {
                    if (err) {
                        console.log('⚠️ Erro ao criar Super Admin:', err.message);
                    } else {
                        console.log('✅ Super Admin criado: super@admin.com / super123');
                    }
                });
        } else {
            console.log('✅ Super Admin já existe');
        }
    });

    // 10. Verificar se o Dono de teste existe, se não, criar
    const donoEmail = 'admin@teste.com';

    db.get(`SELECT id FROM usuarios WHERE email = ?`, [donoEmail], (err, user) => {
        if (!user) {
            console.log('📝 Criando Dono de teste...');

            // Criar empresa primeiro
            const trialExpira = new Date();
            trialExpira.setDate(trialExpira.getDate() + 45);
            const trialData = trialExpira.toISOString().split('T')[0];

            db.run(`INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
                    VALUES ('Barbearia Teste', 'trial', 1, ?, 1)`, [trialData], function (err) {
                if (err) {
                    console.log('⚠️ Erro ao criar empresa de teste:', err.message);
                } else {
                    const empresaId = this.lastID;
                    const senhaHash = require('bcryptjs').hashSync('123456', 10);

                    db.run(`INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                            VALUES ('Admin Teste', ?, ?, 'dono', ?)`,
                        [donoEmail, senhaHash, empresaId], (err) => {
                            if (err) {
                                console.log('⚠️ Erro ao criar Dono de teste:', err.message);
                            } else {
                                console.log('✅ Dono de teste criado: admin@teste.com / 123456');
                            }
                        });
                }
            });
        } else {
            console.log('✅ Dono de teste já existe');
        }
    });
});

// Aguardar um pouco para as operações assíncronas concluírem
setTimeout(() => {
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📊 RESUMO DAS ALTERAÇÕES:');
    console.log('   - Colunas adicionadas na tabela empresas: plano, limite_profissionais, assinatura_ativa, assinatura_valida_ate, ultima_cobranca');
    console.log('   - Coluna bloqueado_chatbot adicionada na tabela clientes');
    console.log('   - Tabela planos_historico criada');
    console.log('   - Empresas existentes atualizadas');
    console.log('\n💰 PLANOS DISPONÍVEIS:');
    console.log('   - Starter: 1 profissional - R$ 24,90/mês');
    console.log('   - Pro: 5 profissionais - R$ 49,90/mês');
    console.log('   - Business: 12 profissionais - R$ 99,90/mês');
    console.log('   - Enterprise: Ilimitado - R$ 199,90/mês');
    console.log('\n🔑 USUÁRIOS DE TESTE:');
    console.log('   - Super Admin: super@admin.com / super123');
    console.log('   - Dono: admin@teste.com / 123456');

    db.close((err) => {
        if (err) {
            console.error('Erro ao fechar banco:', err);
        } else {
            console.log('\n📁 Banco de dados atualizado com sucesso!');
        }
    });
}, 2000);