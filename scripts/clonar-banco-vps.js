// scripts/clonar-banco-vps.js
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURAÇÃO
// ============================================

// PostgreSQL da VPS
const pgPool = new Pool({
    connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

// SQLite local
const sqliteDbPath = path.join(__dirname, '../database/barbearia.db');
const sqliteDb = new sqlite3.Database(sqliteDbPath);

// ============================================
// FUNÇÃO PARA CLONAR TABELAS
// ============================================

async function clonarTabela(nomeTabela) {
    console.log(`📋 Clonando tabela: ${nomeTabela}...`);

    try {
        // 1. Buscar dados do PostgreSQL
        const result = await pgPool.query(`SELECT * FROM ${nomeTabela}`);
        const dados = result.rows;

        if (dados.length === 0) {
            console.log(`   ⚠️ Tabela ${nomeTabela} está vazia`);
            return;
        }

        console.log(`   📊 ${dados.length} registros encontrados`);

        // 2. Obter nomes das colunas
        const colunas = Object.keys(dados[0]);
        const placeholders = colunas.map(() => '?').join(', ');
        const colunasStr = colunas.join(', ');

        // 3. Criar tabela no SQLite
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${nomeTabela} (
                ${colunas.map(c => `"${c}" TEXT`).join(', ')}
            )
        `;

        await new Promise((resolve, reject) => {
            sqliteDb.run(createTableSQL, (err) => {
                if (err) {
                    console.error(`   ❌ Erro ao criar tabela ${nomeTabela}:`, err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        // 4. Limpar tabela (opcional)
        await new Promise((resolve, reject) => {
            sqliteDb.run(`DELETE FROM ${nomeTabela}`, (err) => {
                if (err) {
                    console.error(`   ❌ Erro ao limpar tabela ${nomeTabela}:`, err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        // 5. Inserir dados
        const insertSQL = `INSERT INTO ${nomeTabela} (${colunasStr}) VALUES (${placeholders})`;
        const stmt = sqliteDb.prepare(insertSQL);

        let inseridos = 0;
        for (const row of dados) {
            const valores = colunas.map(col => row[col] !== null ? String(row[col]) : null);
            await new Promise((resolve, reject) => {
                stmt.run(valores, (err) => {
                    if (err) {
                        console.error(`   ❌ Erro ao inserir:`, err.message);
                        reject(err);
                    } else {
                        inseridos++;
                        resolve();
                    }
                });
            });
        }

        stmt.finalize();
        console.log(`   ✅ ${inseridos} registros inseridos`);

    } catch (error) {
        console.error(`   ❌ Erro ao clonar ${nomeTabela}:`, error.message);
    }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function clonarBanco() {
    console.log('\n🔄 CLONANDO BANCO DA VPS PARA SQLITE...\n');

    try {
        // Lista de tabelas para clonar
        const tabelas = [
            'empresas',
            'usuarios',
            'clientes',
            'profissionais',
            'servicos',
            'agendamentos',
            'despesas',
            'horarios_funcionamento',
            'configuracoes',
            'acessos',
            'lembretes_pagamento'
        ];

        for (const tabela of tabelas) {
            await clonarTabela(tabela);
            console.log('');
        }

        console.log('✅ CLONAGEM CONCLUÍDA!');
        console.log(`📁 Banco salvo em: ${sqliteDbPath}`);
        console.log(`📊 Tamanho: ${fs.statSync(sqliteDbPath).size / 1024 / 1024} MB`);

        // Verificar empresas
        sqliteDb.all('SELECT id, nome FROM empresas', (err, rows) => {
            if (err) {
                console.error('❌ Erro ao verificar empresas:', err);
            } else {
                console.log('\n📋 Empresas clonadas:');
                rows.forEach(row => {
                    console.log(`   - ${row.id}: ${row.nome}`);
                });
            }
            sqliteDb.close();
            pgPool.end();
        });

    } catch (error) {
        console.error('❌ Erro na clonagem:', error);
        sqliteDb.close();
        pgPool.end();
    }
}

// ============================================
// EXECUTAR
// ============================================

console.log('🔍 Conectando ao PostgreSQL da VPS...');
pgPool.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado ao PostgreSQL!');
    clonarBanco();
});