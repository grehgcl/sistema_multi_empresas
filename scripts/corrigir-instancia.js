// ============================================
// SCRIPT: corrigir-instancia.js
// Executar: node corrigir-instancia.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 🔥 USAR O BANCO PRINCIPAL
const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🔧 Corrigindo nome da instância no banco principal...');

const db = new sqlite3.Database(dbPath);

db.run(`UPDATE empresas SET whatsapp_instance = 'emp-14-sal-o-da-sandra' WHERE id = 14`, function (err) {
    if (err) {
        console.error('❌ Erro:', err.message);
    } else {
        console.log(`✅ Instância atualizada! (${this.changes} registros)`);

        // Verificar
        db.get(`SELECT id, nome, whatsapp_instance FROM empresas WHERE id = 14`, (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar:', err.message);
            } else {
                console.log(`📱 Empresa: ${row?.nome}`);
                console.log(`📱 Nova instância: ${row?.whatsapp_instance}`);
            }
            db.close();
        });
    }
});