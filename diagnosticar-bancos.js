// diagnosticar-bancos-completo.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('🔍 DIAGNÓSTICO COMPLETO DE BANCOS');
console.log('========================================\n');

const dbDir = path.join(__dirname, 'database');

// Verificar se a pasta existe
if (!fs.existsSync(dbDir)) {
    console.log('❌ Pasta database não encontrada!');
    process.exit(1);
}

// ============================================
// 1. LISTAR TODOS OS BANCOS
// ============================================
console.log('📁 BANCOS EXISTENTES:');
console.log('----------------------------------------');

const arquivos = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));
console.log(`Total: ${arquivos.length} bancos\n`);

// Separar por tipo
const principais = arquivos.filter(f => f === 'barbearia.db' || f === 'central.db');
const empresas = arquivos.filter(f => f !== 'barbearia.db' && f !== 'central.db');

console.log('📄 BANCO PRINCIPAL:');
principais.forEach(f => {
    const size = (fs.statSync(path.join(dbDir, f)).size / 1024).toFixed(1);
    console.log(`   ✅ ${f} (${size} KB)`);
});

console.log('\n🏢 BANCOS DE EMPRESAS:');
empresas.sort().forEach(f => {
    const size = (fs.statSync(path.join(dbDir, f)).size / 1024).toFixed(1);
    
    // Tentar extrair ID
    let id = null;
    let nome = null;
    let formato = 'desconhecido';
    
    // Formato: empresa_X.db
    const matchEmpresa = f.match(/^empresa_(\d+)\.db$/);
    if (matchEmpresa) {
        id = matchEmpresa[1];
        formato = 'empresa_X.db';
    }
    
    // Formato: Nome_ID.db
    const matchNome = f.match(/^(.+)_(\d+)\.db$/);
    if (matchNome) {
        nome = matchNome[1];
        id = matchNome[2];
        formato = 'Nome_ID.db';
    }
    
    // Formato: empresa_X_nome.db
    const matchEmpresaNome = f.match(/^empresa_(\d+)_(.+)\.db$/);
    if (matchEmpresaNome) {
        id = matchEmpresaNome[1];
        nome = matchEmpresaNome[2];
        formato = 'empresa_X_nome.db';
    }
    
    console.log(`   📄 ${f}`);
    console.log(`      Tamanho: ${size} KB | Formato: ${formato}`);
    if (id) console.log(`      ID: ${id}`);
    if (nome) console.log(`      Nome: ${nome}`);
    console.log('');
});

console.log('========================================');

// ============================================
// 2. VERIFICAR EMPRESAS NO BANCO PRINCIPAL
// ============================================
console.log('\n📋 EMPRESAS CADASTRADAS:');
console.log('----------------------------------------');

const db = new sqlite3.Database('database/barbearia.db');

db.all('SELECT id, nome, plano, telefone_dono, created_at FROM empresas ORDER BY CAST(id AS INTEGER)', (err, empresas) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log(`Total: ${empresas.length} empresas\n`);

    // Mapear IDs dos bancos
    const idsBancos = [];
    for (const f of empresas) {
        let id = null;
        const matchEmpresa = f.match(/^empresa_(\d+)\.db$/);
        if (matchEmpresa) id = matchEmpresa[1];
        const matchNome = f.match(/^.+_(\d+)\.db$/);
        if (matchNome) id = matchNome[1];
        if (id) idsBancos.push(id);
    }

    let comBanco = 0;
    let semBanco = 0;

    for (const empresa of empresas) {
        const id = empresa.id;
        const nome = empresa.nome || 'SEM NOME';
        
        // Verificar se o banco existe (qualquer formato)
        let bancoEncontrado = null;
        let formatoEncontrado = null;
        
        // Procurar por empresa_X.db
        const caminhoPadrao = path.join(dbDir, `empresa_${id}.db`);
        if (fs.existsSync(caminhoPadrao)) {
            bancoEncontrado = `empresa_${id}.db`;
            formatoEncontrado = 'empresa_X.db';
        }
        
        // Procurar por Nome_ID.db
        if (!bancoEncontrado) {
            for (const f of empresas) {
                const match = f.match(/^(.+)_(\d+)\.db$/);
                if (match && match[2] === String(id)) {
                    bancoEncontrado = f;
                    formatoEncontrado = 'Nome_ID.db';
                    break;
                }
            }
        }
        
        // Procurar por empresa_X_nome.db
        if (!bancoEncontrado) {
            for (const f of empresas) {
                const match = f.match(/^empresa_(\d+)_(.+)\.db$/);
                if (match && match[1] === String(id)) {
                    bancoEncontrado = f;
                    formatoEncontrado = 'empresa_X_nome.db';
                    break;
                }
            }
        }
        
        const status = bancoEncontrado ? '✅' : '❌';
        if (bancoEncontrado) comBanco++; else semBanco++;
        
        console.log(`   ${status} ID: ${id}`);
        console.log(`      Nome: ${nome}`);
        if (bancoEncontrado) {
            console.log(`      Banco: ${bancoEncontrado} (${formatoEncontrado})`);
        } else {
            console.log(`      Banco: NÃO ENCONTRADO!`);
        }
        console.log('');
    }

    console.log(`📊 Resumo: ${comBanco} com banco | ${semBanco} sem banco`);
    console.log('========================================');

    // ============================================
    // 3. VERIFICAR EMPRESAS COM ID NULL
    // ============================================
    console.log('\n⚠️ EMPRESAS COM PROBLEMAS:');
    console.log('----------------------------------------');

    const empresasNull = empresas.filter(e => e.id === null || e.id === 'null');
    if (empresasNull.length > 0) {
        console.log(`❌ ${empresasNull.length} empresa(s) com ID NULL:`);
        for (const e of empresasNull) {
            console.log(`   - ${e.nome} (ID: ${e.id})`);
        }
    } else {
        console.log('✅ Nenhuma empresa com ID NULL');
    }

    // ============================================
    // 4. VERIFICAR BANCOS ÓRFÃOS
    // ============================================
    console.log('\n⚠️ BANCOS ÓRFÃOS (sem empresa correspondente):');
    console.log('----------------------------------------');

    const idsEmpresas = empresas.map(e => String(e.id)).filter(id => id !== 'null' && id !== null);
    let orfaos = 0;

    for (const f of empresas) {
        if (f === 'barbearia.db' || f === 'central.db') continue;
        
        let id = null;
        const matchEmpresa = f.match(/^empresa_(\d+)\.db$/);
        if (matchEmpresa) id = matchEmpresa[1];
        
        const matchNome = f.match(/^.+_(\d+)\.db$/);
        if (matchNome) id = matchNome[1];
        
        if (id && !idsEmpresas.includes(id)) {
            console.log(`   ⚠️ ${f} - Empresa ${id} não existe!`);
            orfaos++;
        }
    }

    if (orfaos === 0) {
        console.log('   ✅ Nenhum banco órfão encontrado!');
    }

    console.log('\n========================================');

    // ============================================
    // 5. VERIFICAR BANCO DA EMPRESA 17 (ESPECÍFICO)
    // ============================================
    console.log('\n🔍 VERIFICANDO BANCO DA EMPRESA 17:');
    console.log('----------------------------------------');

    const idVerificar = '17';
    let banco17 = null;
    let caminho17 = null;

    // Procurar o banco da empresa 17
    for (const f of empresas) {
        if (f.includes(`_${idVerificar}.db`) || f === `empresa_${idVerificar}.db`) {
            banco17 = f;
            caminho17 = path.join(dbDir, f);
            break;
        }
    }

    if (banco17 && fs.existsSync(caminho17)) {
        console.log(`✅ Banco encontrado: ${banco17}`);
        const size = (fs.statSync(caminho17).size / 1024).toFixed(1);
        console.log(`   Tamanho: ${size} KB`);
        
        const db17 = new sqlite3.Database(caminho17);
        
        // Verificar tabelas
        db17.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
            if (err) {
                console.error('❌ Erro:', err);
                db17.close();
                db.close();
                return;
            }
            
            const tableNames = tables.map(t => t.name);
            console.log(`\n📋 Tabelas (${tableNames.length}):`);
            
            const tabelasEsperadas = ['clientes', 'servicos', 'profissionais', 'agendamentos', 'despesas', 'horarios_funcionamento', 'configuracoes'];
            for (const t of tabelasEsperadas) {
                const existe = tableNames.includes(t);
                console.log(`   ${existe ? '✅' : '❌'} ${t}`);
            }
            
            // Verificar dados
            console.log('\n📊 DADOS:');
            
            db17.get('SELECT COUNT(*) as total FROM servicos', (err, row) => {
                console.log(`   Serviços: ${row?.total || 0}`);
            });
            db17.get('SELECT COUNT(*) as total FROM clientes', (err, row) => {
                console.log(`   Clientes: ${row?.total || 0}`);
            });
            db17.get('SELECT COUNT(*) as total FROM profissionais', (err, row) => {
                console.log(`   Profissionais: ${row?.total || 0}`);
            });
            db17.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                console.log(`   Agendamentos: ${row?.total || 0}`);
            });
            db17.get('SELECT COUNT(*) as total FROM horarios_funcionamento', (err, row) => {
                console.log(`   Horários de funcionamento: ${row?.total || 0}`);
                
                // Mostrar horários
                db17.all('SELECT dia_semana, aberto, hora_inicio, hora_fim FROM horarios_funcionamento ORDER BY dia_semana', (err, horarios) => {
                    if (!err && horarios) {
                        console.log('\n📅 HORÁRIOS DE FUNCIONAMENTO:');
                        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                        for (const h of horarios) {
                            const status = h.aberto == 1 ? '✅ ABERTO' : '❌ FECHADO';
                            console.log(`   ${dias[h.dia_semana] || h.dia_semana}: ${status} ${h.aberto == 1 ? `${h.hora_inicio} - ${h.hora_fim}` : ''}`);
                        }
                    }
                    db17.close();
                    db.close();
                    
                    console.log('\n========================================');
                    console.log('✅ DIAGNÓSTICO CONCLUÍDO!');
                });
            });
        });
    } else {
        console.log(`❌ Banco da empresa 17 NÃO ENCONTRADO!`);
        console.log('\n🔍 Procurando por outros bancos com ID 17:');
        for (const f of empresas) {
            if (f.includes('17') || f.includes('_17')) {
                console.log(`   📄 ${f}`);
            }
        }
        db.close();
        console.log('\n========================================');
        console.log('✅ DIAGNÓSTICO CONCLUÍDO!');
    }
});