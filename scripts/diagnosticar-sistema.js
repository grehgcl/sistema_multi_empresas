// diagnosticar-sistema.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

console.log('========================================');
console.log('🔍 DIAGNÓSTICO DO SISTEMA - SEE&AGENDE');
console.log('========================================\n');

// ============================================
// 1. VERIFICAR VARIÁVEIS DE AMBIENTE
// ============================================
console.log('📋 VARIÁVEIS DE AMBIENTE:');
console.log('----------------------------------------');

console.log(`   NODE_ENV: ${process.env.NODE_ENV || '❌ NÃO DEFINIDO'}`);
console.log(`   RENDER: ${process.env.RENDER || '❌ NÃO DEFINIDO'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ DEFINIDO' : '❌ NÃO DEFINIDO'}`);
console.log(`   WHATSAPP_ENABLED: ${process.env.WHATSAPP_ENABLED || '❌ NÃO DEFINIDO'}`);
console.log(`   WHATSAPP_PROVIDER: ${process.env.WHATSAPP_PROVIDER || '❌ NÃO DEFINIDO'}`);
console.log(`   EVOLUTION_API_URL: ${process.env.EVOLUTION_API_URL || '❌ NÃO DEFINIDO'}`);
console.log(`   EVOLUTION_API_KEY: ${process.env.EVOLUTION_API_KEY ? '✅ DEFINIDO' : '❌ NÃO DEFINIDO'}`);

// ============================================
// 2. VERIFICAR ARQUIVOS .ENV
// ============================================
console.log('\n📁 ARQUIVOS .ENV:');
console.log('----------------------------------------');

const envFiles = ['.env', '.env.dev', '.env.local', '.env.production'];
for (const file of envFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
        console.log(`   ❌ ${file} (NÃO ENCONTRADO)`);
    }
}

// ============================================
// 3. VERIFICAR QUAL BANCO ESTÁ SENDO USADO
// ============================================
console.log('\n🗄️ BANCO DE DADOS:');
console.log('----------------------------------------');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
console.log(`   🔥 Modo detectado: ${isProduction ? 'PRODUÇÃO (PostgreSQL)' : 'DESENVOLVIMENTO (SQLite)'}`);

const dbPath = path.join(__dirname, 'database', 'barbearia.db');
if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`   ✅ barbearia.db (${(stats.size / 1024).toFixed(1)} KB)`);
    
    // Verificar empresas
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT COUNT(*) as total FROM empresas', (err, row) => {
        if (err) {
            console.log(`   ❌ Erro ao ler empresas: ${err.message}`);
        } else {
            console.log(`   📊 Empresas: ${row?.total || 0}`);
        }
        
        db.get('SELECT COUNT(*) as total FROM usuarios', (err, row) => {
            if (err) {
                console.log(`   ❌ Erro ao ler usuários: ${err.message}`);
            } else {
                console.log(`   📊 Usuários: ${row?.total || 0}`);
            }
            db.close();
        });
    });
} else {
    console.log(`   ❌ barbearia.db NÃO ENCONTRADO`);
}

// ============================================
// 4. VERIFICAR BANCOS INDIVIDUAIS
// ============================================
console.log('\n🏢 BANCOS INDIVIDUAIS:');
console.log('----------------------------------------');

const dbDir = path.join(__dirname, 'database');
if (fs.existsSync(dbDir)) {
    const arquivos = fs.readdirSync(dbDir).filter(f => f.endsWith('.db') && f !== 'barbearia.db');
    console.log(`   Total: ${arquivos.length} bancos individuais`);
    
    if (arquivos.length > 0) {
        console.log('\n   📋 Últimos 10 bancos:');
        arquivos.slice(0, 10).forEach(f => {
            const stats = fs.statSync(path.join(dbDir, f));
            console.log(`      ${f} (${(stats.size / 1024).toFixed(1)} KB)`);
        });
        if (arquivos.length > 10) {
            console.log(`      ... e mais ${arquivos.length - 10} bancos`);
        }
    }
} else {
    console.log('   ❌ Pasta database NÃO ENCONTRADA');
}

// ============================================
// 5. VERIFICAR ARQUIVO SERVER.JS
// ============================================
console.log('\n📄 ARQUIVO SERVER.JS:');
console.log('----------------------------------------');

const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    const content = fs.readFileSync(serverPath, 'utf8');
    const hasSQLite = content.includes('sqlite3');
    const hasPostgres = content.includes('pg') || content.includes('Pool');
    const hasRoutes = content.includes('require(./server/routes)');
    
    console.log(`   ✅ server.js encontrado`);
    console.log(`   🔧 SQLite: ${hasSQLite ? '✅' : '❌'}`);
    console.log(`   🔧 PostgreSQL: ${hasPostgres ? '✅' : '❌'}`);
    console.log(`   🔧 Rotas extraídas: ${hasRoutes ? '✅' : '❌'}`);
} else {
    console.log(`   ❌ server.js NÃO ENCONTRADO`);
}

// ============================================
// 6. VERIFICAR CONFIGURAÇÃO DO DATABASE.JS
// ============================================
console.log('\n📄 CONFIGURAÇÃO DATABASE.JS:');
console.log('----------------------------------------');

const dbConfigPath = path.join(__dirname, 'server', 'config', 'database.js');
if (fs.existsSync(dbConfigPath)) {
    const content = fs.readFileSync(dbConfigPath, 'utf8');
    const hasSQLite = content.includes('sqlite3');
    const hasPostgres = content.includes('pg') || content.includes('Pool');
    const hasGetEmpresaDb = content.includes('getEmpresaDb');
    const hasEmpresaDbCache = content.includes('empresaDbCache');
    
    console.log(`   ✅ database.js encontrado`);
    console.log(`   🔧 SQLite: ${hasSQLite ? '✅' : '❌'}`);
    console.log(`   🔧 PostgreSQL: ${hasPostgres ? '✅' : '❌'}`);
    console.log(`   🔧 getEmpresaDb: ${hasGetEmpresaDb ? '✅' : '❌'}`);
    console.log(`   🔧 Cache de bancos: ${hasEmpresaDbCache ? '✅' : '❌'}`);
} else {
    console.log(`   ❌ database.js NÃO ENCONTRADO`);
}

// ============================================
// 7. VERIFICAR ROTAS
// ============================================
console.log('\n📁 ROTAS:');
console.log('----------------------------------------');

const routesDir = path.join(__dirname, 'server', 'routes');
if (fs.existsSync(routesDir)) {
    const arquivos = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    console.log(`   Total: ${arquivos.length} arquivos de rota`);
    
    const rotasImportantes = ['auth.routes.js', 'empresas.routes.js', 'whatsapp.routes.js', 'chatbot.routes.js', 'admin.routes.js'];
    for (const rota of rotasImportantes) {
        const existe = arquivos.includes(rota);
        console.log(`   ${existe ? '✅' : '❌'} ${rota}`);
    }
} else {
    console.log(`   ❌ Pasta routes NÃO ENCONTRADA`);
}

// ============================================
// 8. VERIFICAR O QUE ESTÁ SENDO IMPORTADO
// ============================================
console.log('\n📋 STATUS GERAL:');
console.log('----------------------------------------');

// Verificar se o sistema está usando SQLite ou PostgreSQL
const usandoSQLite = isProduction === false || process.env.DATABASE_URL === undefined;
const usandoPostgres = isProduction === true && process.env.DATABASE_URL !== undefined;

console.log(`   🟢 Usando SQLite: ${usandoSQLite ? '✅ SIM' : '❌ NÃO'}`);
console.log(`   🔵 Usando PostgreSQL: ${usandoPostgres ? '✅ SIM' : '❌ NÃO'}`);
console.log(`   📁 Bancos individuais: ${fs.existsSync(dbDir) ? fs.readdirSync(dbDir).filter(f => f.endsWith('.db') && f !== 'barbearia.db').length : 0}`);

console.log('\n========================================');
console.log('✅ DIAGNÓSTICO CONCLUÍDO!');
console.log('========================================');