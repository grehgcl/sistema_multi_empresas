const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('📤 EXPORTANDO ESTRUTURA E DADOS DO BANCO SQLITE');
console.log('='.repeat(60));

const exportDir = path.join(__dirname, '../exportacao');
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
}

// ============================================
// LISTA DE COLUNAS BOOLEANAS
// ============================================
const COLUNAS_BOOLEAN = [
    'pago', 'aberto', 'ativo', 'assinatura_ativa',
    'bloqueado_chatbot', 'lembrete_enviado'
];

// ============================================
// FUNÇÃO PARA VERIFICAR SE É FUNÇÃO DEFAULT
// ============================================
function isDefaultFunction(valor) {
    if (!valor) return false;
    const funcs = ['CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'NOW()'];
    return funcs.some(f => valor.toUpperCase().includes(f));
}

// ============================================
// FUNÇÃO PARA CONVERTER VALOR BOOLEANO
// ============================================
function converterBooleano(valor) {
    if (valor === null || valor === undefined) return 'NULL';
    if (typeof valor === 'boolean') return valor ? 'TRUE' : 'FALSE';
    if (typeof valor === 'number') return valor !== 0 ? 'TRUE' : 'FALSE';
    if (typeof valor === 'string') {
        const v = valor.toLowerCase().trim();
        if (v === '1' || v === 'true' || v === 't') return 'TRUE';
        if (v === '0' || v === 'false' || v === 'f') return 'FALSE';
        return `'${valor}'`;
    }
    return `'${String(valor)}'`;
}

// ============================================
// 1. LISTAR TODAS AS TABELAS
// ============================================
console.log('\n📋 1. LISTANDO TABELAS...');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    const nomesTabelas = tables.map(t => t.name).filter(t => t !== 'sqlite_sequence');
    console.log(`✅ ${nomesTabelas.length} tabelas encontradas:`);
    nomesTabelas.forEach(t => console.log(`   - ${t}`));

    // ============================================
    // 2. EXPORTAR ESTRUTURA DE CADA TABELA
    // ============================================
    console.log('\n📝 2. EXPORTANDO ESTRUTURA DAS TABELAS...');

    const estruturaCompleta = {};
    let estruturasProcessadas = 0;

    nomesTabelas.forEach((tabela) => {
        db.all(`PRAGMA table_info(${tabela})`, (err, columns) => {
            if (err) {
                console.error(`❌ Erro ao buscar estrutura de ${tabela}:`, err.message);
                return;
            }

            estruturaCompleta[tabela] = columns;
            console.log(`   ✅ ${tabela}: ${columns.length} colunas`);
            estruturasProcessadas++;

            if (estruturasProcessadas === nomesTabelas.length) {
                const estruturaPath = path.join(exportDir, 'estrutura.json');
                fs.writeFileSync(estruturaPath, JSON.stringify(estruturaCompleta, null, 2));
                console.log(`\n📁 Estrutura salva em: ${estruturaPath}`);

                // ============================================
                // 3. EXPORTAR DADOS DE CADA TABELA
                // ============================================
                console.log('\n📊 3. EXPORTANDO DADOS DAS TABELAS...');

                const dadosCompletos = {};
                let dadosProcessados = 0;

                nomesTabelas.forEach((tabela) => {
                    db.all(`SELECT * FROM ${tabela}`, (err, rows) => {
                        if (err) {
                            console.error(`❌ Erro ao buscar dados de ${tabela}:`, err.message);
                            return;
                        }

                        dadosCompletos[tabela] = rows;
                        console.log(`   ✅ ${tabela}: ${rows.length} registros`);
                        dadosProcessados++;

                        if (dadosProcessados === nomesTabelas.length) {
                            const dadosPath = path.join(exportDir, 'dados.json');
                            fs.writeFileSync(dadosPath, JSON.stringify(dadosCompletos, null, 2));
                            console.log(`\n📁 Dados salvos em: ${dadosPath}`);

                            // ============================================
                            // 4. GERAR SCRIPT SQL PARA POSTGRESQL
                            // ============================================
                            console.log('\n🔧 4. GERANDO SCRIPT SQL PARA POSTGRESQL...');
                            gerarScriptPostgreSQL(estruturaCompleta, dadosCompletos, nomesTabelas);
                        }
                    });
                });
            }
        });
    });
});

// ============================================
// 4. GERAR SCRIPT SQL PARA POSTGRESQL
// ============================================
function gerarScriptPostgreSQL(estrutura, dados, tabelas) {
    const sqlLines = [];

    // Cabeçalho
    sqlLines.push('-- ============================================');
    sqlLines.push('-- SCRIPT DE MIGRAÇÃO PARA POSTGRESQL');
    sqlLines.push('-- GERADO EM: ' + new Date().toLocaleString());
    sqlLines.push('-- ============================================');
    sqlLines.push('');

    // Mapeamento de tipos SQLite para PostgreSQL
    const tipoMap = {
        'INTEGER': 'INTEGER',
        'REAL': 'DECIMAL(10,2)',
        'TEXT': 'TEXT',
        'BLOB': 'BYTEA',
        'DATETIME': 'TIMESTAMP',
        'DATE': 'DATE',
        'BOOLEAN': 'BOOLEAN'
    };

    // Gerar CREATE TABLE para cada tabela
    tabelas.forEach((tabela) => {
        const cols = estrutura[tabela] || [];
        if (cols.length === 0) return;

        sqlLines.push(`-- Tabela: ${tabela}`);
        sqlLines.push(`DROP TABLE IF EXISTS ${tabela} CASCADE;`);
        sqlLines.push(`CREATE TABLE ${tabela} (`);

        const colDefs = cols.map((col) => {
            let tipo = tipoMap[col.type] || col.type;

            // 🔥 Se for coluna booleana, forçar tipo BOOLEAN
            if (COLUNAS_BOOLEAN.includes(col.name.toLowerCase())) {
                tipo = 'BOOLEAN';
            }

            if (col.pk === 1) {
                tipo = 'SERIAL';
            }

            let def = `    ${col.name} ${tipo}`;
            if (col.pk === 1) {
                def += ' PRIMARY KEY';
            }
            if (col.notnull === 1 && col.pk !== 1) {
                def += ' NOT NULL';
            }

            // 🔥 CORRIGIR DEFAULT PARA BOOLEAN
            if (col.dflt_value !== null && col.dflt_value !== undefined) {
                let defaultValue = col.dflt_value;

                // Se for coluna booleana, converter 0/1 para FALSE/TRUE
                if (COLUNAS_BOOLEAN.includes(col.name.toLowerCase())) {
                    if (defaultValue === '0' || defaultValue === 0) {
                        defaultValue = 'FALSE';
                    } else if (defaultValue === '1' || defaultValue === 1) {
                        defaultValue = 'TRUE';
                    }
                }

                // Verificar se é função (CURRENT_TIMESTAMP, etc)
                if (isDefaultFunction(defaultValue)) {
                    def += ` DEFAULT ${defaultValue}`;
                } else {
                    // Para valores com aspas
                    if (typeof defaultValue === 'string') {
                        if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
                            defaultValue = defaultValue.slice(1, -1);
                        }
                        // Se for string, colocar entre aspas simples
                        if (!defaultValue.match(/^\d+$/) && defaultValue !== 'TRUE' && defaultValue !== 'FALSE') {
                            defaultValue = `'${defaultValue}'`;
                        }
                    }
                    def += ` DEFAULT ${defaultValue}`;
                }
            }
            return def;
        });

        sqlLines.push(colDefs.join(',\n'));
        sqlLines.push(');');
        sqlLines.push('');

        // Gerar INSERTs para os dados
        const rows = dados[tabela] || [];
        if (rows.length > 0) {
            const colunas = cols.map(c => c.name);

            // Verificar colunas com DEFAULT que devem ser ignoradas
            const colunasIgnoradas = [];
            cols.forEach((col) => {
                if (col.dflt_value && isDefaultFunction(col.dflt_value)) {
                    colunasIgnoradas.push(col.name);
                }
            });

            const colunasInsert = colunas.filter(c => !colunasIgnoradas.includes(c));

            if (colunasInsert.length > 0) {
                sqlLines.push(`-- Inserindo ${rows.length} registros em ${tabela}`);
                sqlLines.push(`INSERT INTO ${tabela} (${colunasInsert.join(', ')}) VALUES`);

                const values = rows.map((row) => {
                    const vals = colunasInsert.map((col) => {
                        let val = row[col];
                        if (val === null || val === undefined) return 'NULL';

                        // 🔥 Converter valores booleanos
                        if (COLUNAS_BOOLEAN.includes(col.toLowerCase())) {
                            if (val === 0 || val === '0') return 'FALSE';
                            if (val === 1 || val === '1') return 'TRUE';
                            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        }

                        if (typeof val === 'string') {
                            return `'${val.replace(/'/g, "''")}'`;
                        }
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (typeof val === 'number') return String(val);
                        return `'${String(val).replace(/'/g, "''")}'`;
                    });
                    return `(${vals.join(', ')})`;
                });

                sqlLines.push(values.join(',\n'));
                sqlLines.push(';');
                sqlLines.push('');
            }

            // Resetar sequência
            sqlLines.push(`-- Resetar sequência da tabela ${tabela}`);
            sqlLines.push(`SELECT setval('${tabela}_id_seq', (SELECT MAX(id) FROM ${tabela}));`);
            sqlLines.push('');
        }
    });

    // Salvar arquivo SQL
    const sqlPath = path.join(__dirname, '../exportacao/migracao_postgresql_corrigido.sql');
    fs.writeFileSync(sqlPath, sqlLines.join('\n'));
    console.log(`\n📁 Script SQL gerado em: ${sqlPath}`);

    // ============================================
    // 5. GERAR RELATÓRIO FINAL
    // ============================================
    let relatorio = '='.repeat(60) + '\n';
    relatorio += 'RELATÓRIO DE EXPORTAÇÃO DO BANCO SQLITE\n';
    relatorio += '='.repeat(60) + '\n\n';
    relatorio += `Data de exportação: ${new Date().toLocaleString()}\n`;
    relatorio += `Total de tabelas: ${tabelas.length}\n\n`;

    relatorio += 'TABELAS E REGISTROS:\n';
    relatorio += '-'.repeat(40) + '\n';
    tabelas.forEach((tabela) => {
        const qtd = dados[tabela]?.length || 0;
        const cols = estrutura[tabela]?.length || 0;
        relatorio += `  ${tabela.padEnd(25)} ${String(qtd).padStart(6)} registros  (${cols} colunas)\n`;
    });

    relatorio += '\n' + '='.repeat(60) + '\n';
    relatorio += 'ARQUIVOS GERADOS:\n';
    relatorio += '-'.repeat(40) + '\n';
    relatorio += `  📁 ${exportDir}/estrutura.json\n`;
    relatorio += `  📁 ${exportDir}/dados.json\n`;
    relatorio += `  📁 ${exportDir}/migracao_postgresql_corrigido.sql\n`;
    relatorio += '\n' + '='.repeat(60) + '\n';

    const relatorioPath = path.join(__dirname, '../exportacao/relatorio.txt');
    fs.writeFileSync(relatorioPath, relatorio);

    console.log(`📁 Relatório salvo em: ${relatorioPath}`);
    console.log('\n✅ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`📁 Arquivos gerados em: ${exportDir}`);

    db.close();
}