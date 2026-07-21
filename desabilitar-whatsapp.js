const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'barbearia.db'));

db.run('UPDATE empresas SET whatsapp_proprio_habilitado = 0 WHERE id = 3', function (err) {
    if (err) {
        console.error('❌ Erro ao atualizar:', err.message);
    } else {
        console.log(`✅ WhatsApp próprio desabilitado para empresa ID 3`);
        console.log(`📊 Linhas afetadas: ${this.changes}`);

        // Verificar
        db.get('SELECT id, nome, whatsapp_proprio_habilitado FROM empresas WHERE id = 3', (err, row) => {
            if (row) {
                console.log(`📋 Empresa: ${row.nome} (ID: ${row.id})`);
                console.log(`📱 WhatsApp próprio: ${row.whatsapp_proprio_habilitado === 1 ? 'HABILITADO' : 'DESABILITADO'}`);
            }
            db.close();
        });
    }
});