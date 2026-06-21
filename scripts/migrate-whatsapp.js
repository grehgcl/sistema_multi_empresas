// scripts/migrate-whatsapp.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco
const dbPath = path.join(__dirname, '..', 'database', 'barbearia.db');
console.log('📁 Banco:', dbPath);

// Conecta diretamente ao SQLite (sem o wrapper)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado ao SQLite');
});

console.log('🔄 Iniciando migração WhatsApp...\n');

// Função para executar comandos
function runQuery(sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, function (err) {
            if (err) {
                // Ignora erro de coluna duplicada
                if (err.message.includes('duplicate column name')) {
                    console.log('ℹ️ Coluna já existe, ignorando...');
                    resolve();
                } else {
                    reject(err);
                }
            } else {
                resolve();
            }
        });
    });
}

// Função para listar colunas
function getColumns(table) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function migrate() {
    try {
        // 1. Adicionar lembrete_enviado em agendamentos
        console.log('📝 Adicionando lembrete_enviado em agendamentos...');
        try {
            await runQuery('ALTER TABLE agendamentos ADD COLUMN lembrete_enviado INTEGER DEFAULT 0');
            console.log('✅ Coluna lembrete_enviado adicionada');
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('ℹ️ Coluna lembrete_enviado já existe');
            } else {
                throw err;
            }
        }

        // 2. Adicionar telefone em profissionais
        console.log('📝 Adicionando telefone em profissionais...');
        try {
            await runQuery('ALTER TABLE profissionais ADD COLUMN telefone TEXT');
            console.log('✅ Coluna telefone adicionada');
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('ℹ️ Coluna telefone já existe');
            } else {
                throw err;
            }
        }

        // 3. Verificar estrutura
        console.log('\n📊 Verificando estrutura:');

        const agendamentosCols = await getColumns('agendamentos');
        console.log('\n📋 Colunas em agendamentos:');
        agendamentosCols.forEach(col => {
            const isNew = col.name === 'lembrete_enviado' ? ' 🆕' : '';
            console.log(`   - ${col.name} (${col.type})${isNew}`);
        });

        const profissionaisCols = await getColumns('profissionais');
        console.log('\n📋 Colunas em profissionais:');
        profissionaisCols.forEach(col => {
            const isNew = col.name === 'telefone' ? ' 🆕' : '';
            console.log(`   - ${col.name} (${col.type})${isNew}`);
        });

        console.log('\n✅ Migração WhatsApp concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        console.error('Detalhes:', error);
    } finally {
        db.close(() => {
            console.log('🔒 Conexão fechada');
        });
    }
}

// Executa
migrate();