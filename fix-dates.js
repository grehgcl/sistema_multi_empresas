// fix-dates.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Corrigindo datas no banco...\n');

// Buscar todos os agendamentos
db.all('SELECT id, data FROM agendamentos', (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    let count = 0;
    let errors = 0;

    rows.forEach(row => {
        let dataOriginal = row.data;
        let dataCorrigida = null;

        // Se for null ou undefined, pular
        if (!dataOriginal) {
            console.log(`⚠️ ID ${row.id}: Data vazia, ignorando...`);
            return;
        }

        // Se for string
        if (typeof dataOriginal === 'string') {
            // Se tem T (formato ISO), pegar só a data
            if (dataOriginal.includes('T')) {
                dataCorrigida = dataOriginal.split('T')[0];
            }
            // Se tem GMT
            else if (dataOriginal.includes('GMT')) {
                const parts = dataOriginal.split(' ');
                if (parts.length > 0) {
                    dataCorrigida = parts[0];
                }
            }
            // Se já está no formato YYYY-MM-DD, manter
            else if (dataOriginal.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dataCorrigida = dataOriginal;
            }
            // Tentar converter de outros formatos
            else {
                try {
                    const d = new Date(dataOriginal);
                    if (!isNaN(d.getTime())) {
                        dataCorrigida = d.toISOString().split('T')[0];
                    }
                } catch (e) { }
            }
        }
        // Se for número (timestamp)
        else if (typeof dataOriginal === 'number') {
            try {
                const d = new Date(dataOriginal);
                if (!isNaN(d.getTime())) {
                    dataCorrigida = d.toISOString().split('T')[0];
                }
            } catch (e) { }
        }

        // Se conseguiu corrigir e é diferente do original
        if (dataCorrigida && dataCorrigida !== dataOriginal) {
            db.run('UPDATE agendamentos SET data = ? WHERE id = ?', [dataCorrigida, row.id], function (err) {
                if (err) {
                    console.error(`❌ Erro ao atualizar ID ${row.id}:`, err);
                    errors++;
                } else {
                    console.log(`✅ ID ${row.id}: "${dataOriginal}" -> "${dataCorrigida}"`);
                    count++;
                }
            });
        } else if (dataCorrigida && dataCorrigida === dataOriginal) {
            console.log(`ℹ️ ID ${row.id}: Já está correto: "${dataOriginal}"`);
        } else {
            console.log(`⚠️ ID ${row.id}: Não foi possível corrigir: "${dataOriginal}"`);
            errors++;
        }
    });

    // Aguardar processamento e fechar
    setTimeout(() => {
        console.log(`\n📊 Resumo: ${count} registros corrigidos, ${errors} erros`);
        db.close();
    }, 2000);
});