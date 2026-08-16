// importar-agendamentos-vps.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const empresaId = 10; // Studio Sandro matias

console.log('========================================');
console.log('🔄 IMPORTANDO AGENDAMENTOS DA VPS');
console.log('   Empresa: Studio Sandro matias (ID: 10)');
console.log('========================================\n');

// Encontrar o banco da empresa
const dbDir = path.join(__dirname, 'database');
const arquivos = fs.readdirSync(dbDir);

let dbPath = null;
for (const f of arquivos) {
    if (f.includes(`_${empresaId}.db`) || f === `empresa_${empresaId}.db`) {
        dbPath = path.join(dbDir, f);
        break;
    }
}

if (!dbPath) {
    console.log('❌ Banco não encontrado!');
    process.exit(1);
}

console.log(`📁 Banco: ${path.basename(dbPath)}`);

// ============================================
// FUNÇÕES DE LIMPEZA
// ============================================

function limparData(dataStr) {
    if (!dataStr) return null;
    
    try {
        // Se for "Fri Aug 07 2026 00:00:00 GMT-0300"
        if (typeof dataStr === 'string' && dataStr.includes('GMT')) {
            const match = dataStr.match(/([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4})/);
            if (match) {
                const dataObj = new Date(match[1]);
                if (!isNaN(dataObj)) {
                    return dataObj.toISOString().split('T')[0];
                }
            }
        }
        
        // Se for "2026-08-07" ou "2026-08-07T00:00:00"
        if (typeof dataStr === 'string' && dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            return dataStr.split('T')[0];
        }
        
        // Se for "07/08/2026"
        if (typeof dataStr === 'string' && dataStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            const partes = dataStr.split('/');
            return `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        
        // Tentar converter via Date
        const dataObj = new Date(dataStr);
        if (!isNaN(dataObj)) {
            return dataObj.toISOString().split('T')[0];
        }
        
        return dataStr;
    } catch {
        return dataStr;
    }
}

function limparHora(horaStr) {
    if (!horaStr) return null;
    
    try {
        // Se for "17:00:00" → "17:00"
        if (typeof horaStr === 'string' && horaStr.includes(':')) {
            const partes = horaStr.split(':');
            if (partes.length >= 2) {
                return `${partes[0]}:${partes[1]}`;
            }
        }
        return horaStr;
    } catch {
        return horaStr;
    }
}

// ============================================
// BUSCAR DA VPS
// ============================================

console.log('📡 Buscando agendamentos na VPS...');

// Ajuste a URL conforme necessário
const VPS_URL = 'http://163.176.218.131:3000';

axios.get(`${VPS_URL}/api/agendamentos?empresa=${empresaId}`)
.then(response => {
    const data = response.data;
    
    if (!data.success) {
        console.log('❌ Erro na resposta da VPS:', data.message);
        return;
    }

    if (!data.data || data.data.length === 0) {
        console.log('❌ Nenhum agendamento encontrado na VPS');
        return;
    }

    console.log(`📊 ${data.data.length} agendamentos encontrados na VPS`);
    console.log('\n🔄 Importando...\n');

    const db = new sqlite3.Database(dbPath);

    let inseridos = 0;
    let erros = 0;

    for (const ag of data.data) {
        // 🔥 LIMPAR DATA E HORA
        const dataLimpa = limparData(ag.data);
        const horaLimpa = limparHora(ag.hora);

        console.log(`   ID ${ag.id}: ${ag.data} → ${dataLimpa} | ${ag.hora} → ${horaLimpa}`);

        db.run(
            `INSERT INTO agendamentos 
             (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ag.cliente_id,
                dataLimpa,
                horaLimpa,
                ag.servico_id || null,
                ag.servico || '',
                ag.valor || 0,
                ag.duracao || 30,
                ag.status || 'pendente',
                ag.empresa_id || empresaId,
                ag.profissional_id || null
            ],
            function(err) {
                if (err) {
                    console.error(`   ❌ Erro ao inserir ID ${ag.id}:`, err.message);
                    erros++;
                } else {
                    inseridos++;
                }
            }
        );
    }

    // Aguardar as inserções completarem
    setTimeout(() => {
        console.log('\n========================================');
        console.log('📊 RESULTADO:');
        console.log(`   ✅ Inseridos: ${inseridos}`);
        console.log(`   ❌ Erros: ${erros}`);
        
        db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
            if (err) {
                console.error('❌ Erro:', err);
            } else {
                console.log(`   📋 Total no banco: ${row?.total || 0}`);
            }
            db.close();
            console.log('\n✅ PROCESSO CONCLUÍDO!');
            console.log('========================================');
        });
    }, 3000);
})
.catch(err => {
    console.error('❌ Erro ao importar da VPS:', err.message);
    console.log('\n💡 Dica: Verifique se a VPS está acessível.');
});