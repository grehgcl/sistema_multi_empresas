// recriar-tabela-empresas.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('database/barbearia.db');

console.log('========================================');
console.log('🔧 RECRIANDO TABELA EMPRESAS');
console.log('========================================\n');

// 1. Fazer backup dos dados existentes
console.log('📦 Fazendo backup dos dados...');

db.all('SELECT * FROM empresas', (err, empresas) => {
    if (err) {
        console.error('❌ Erro ao buscar dados:', err);
        db.close();
        return;
    }

    console.log(`   ✅ ${empresas.length} empresas encontradas`);

    // 2. Renomear tabela antiga
    console.log('\n📝 Renomeando tabela antiga...');
    db.run('ALTER TABLE empresas RENAME TO empresas_old', (err) => {
        if (err) {
            console.error('❌ Erro ao renomear:', err);
            db.close();
            return;
        }
        console.log('   ✅ Tabela renomeada para empresas_old');

        // 3. Criar nova tabela com AUTOINCREMENT
        console.log('\n📝 Criando nova tabela...');
        db.run(`
            CREATE TABLE empresas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                plano TEXT DEFAULT 'trial',
                trial_expira TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                limite_profissionais INTEGER DEFAULT 1,
                assinatura_ativa INTEGER DEFAULT 1,
                assinatura_valida_ate TEXT,
                ultima_cobranca TEXT,
                agendamentos_mes INTEGER DEFAULT 0,
                mes_referencia TEXT,
                dias_bloqueio_geral TEXT,
                telefone_dono TEXT,
                endereco TEXT,
                whatsapp_instance TEXT,
                whatsapp_connected INTEGER DEFAULT 0,
                whatsapp_number TEXT,
                whatsapp_connected_at TEXT,
                whatsapp_proprio_habilitado INTEGER DEFAULT 0
            )
        `, (err) => {
            if (err) {
                console.error('❌ Erro ao criar tabela:', err);
                db.close();
                return;
            }
            console.log('   ✅ Nova tabela criada');

            // 4. Migrar dados (ignorando registros com id NULL)
            console.log('\n📝 Migrando dados...');
            
            let migrados = 0;
            let ignorados = 0;
            
            // Processar cada empresa
            for (const empresa of empresas) {
                // 🔥 IGNORAR EMPRESAS COM ID NULL
                if (empresa.id === null || empresa.id === 'null' || empresa.id === undefined) {
                    ignorados++;
                    console.log(`   ⚠️ Ignorando: ${empresa.nome} (sem ID)`);
                    continue;
                }

                db.run(`
                    INSERT INTO empresas (
                        id, nome, plano, trial_expira, created_at,
                        limite_profissionais, assinatura_ativa, assinatura_valida_ate,
                        ultima_cobranca, agendamentos_mes, mes_referencia,
                        dias_bloqueio_geral, telefone_dono, endereco,
                        whatsapp_instance, whatsapp_connected, whatsapp_number,
                        whatsapp_connected_at, whatsapp_proprio_habilitado
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    empresa.id,
                    empresa.nome,
                    empresa.plano || 'trial',
                    empresa.trial_expira,
                    empresa.created_at || new Date().toISOString(),
                    parseInt(empresa.limite_profissionais) || 1,
                    parseInt(empresa.assinatura_ativa) || 1,
                    empresa.assinatura_valida_ate,
                    empresa.ultima_cobranca,
                    parseInt(empresa.agendamentos_mes) || 0,
                    empresa.mes_referencia,
                    empresa.dias_bloqueio_geral,
                    empresa.telefone_dono,
                    empresa.endereco,
                    empresa.whatsapp_instance,
                    parseInt(empresa.whatsapp_connected) || 0,
                    empresa.whatsapp_number,
                    empresa.whatsapp_connected_at,
                    parseInt(empresa.whatsapp_proprio_habilitado) || 0
                ], function(err) {
                    if (err) {
                        console.error(`   ❌ Erro ao migrar ${empresa.nome}:`, err);
                    } else {
                        migrados++;
                        console.log(`   ✅ Migrado: ${empresa.nome} (ID: ${empresa.id})`);
                    }
                });
            }

            // 5. Verificar resultado
            setTimeout(() => {
                db.all('SELECT id, nome FROM empresas ORDER BY id', (err, rows) => {
                    if (err) {
                        console.error('❌ Erro:', err);
                        db.close();
                        return;
                    }

                    console.log('\n========================================');
                    console.log('📊 RESULTADO:');
                    console.log(`   ✅ Migrados: ${migrados}`);
                    console.log(`   ⚠️ Ignorados: ${ignorados} (sem ID)`);
                    console.log(`   📋 Total: ${rows.length} empresas`);
                    
                    console.log('\n📋 EMPRESAS MIGRADAS:');
                    rows.forEach(r => console.log(`   ${r.id} - ${r.nome}`));

                    // 6. Deletar tabela antiga (opcional)
                    console.log('\n🗑️ Deletando tabela antiga...');
                    db.run('DROP TABLE empresas_old', (err) => {
                        if (err) {
                            console.error('❌ Erro ao deletar:', err);
                        } else {
                            console.log('   ✅ Tabela antiga removida');
                        }
                        db.close();
                        console.log('\n✅ RECRIAÇÃO CONCLUÍDA!');
                    });
                });
            }, 1000);
        });
    });
});