const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'barbearia.db'));

const sql = `
    UPDATE empresas 
    SET 
        whatsapp_connected = 1,
        whatsapp_number = '41997391855',
        whatsapp_connected_at = datetime('now')
    WHERE id = 5
`;

db.run(sql, function (err) {
    if (err) {
        console.error('❌ Erro ao atualizar:', err.message);
    } else {
        console.log(`✅ WhatsApp próprio ATUALIZADO para empresa ID 5`);
        console.log(`📊 Linhas afetadas: ${this.changes}`);

        // Verificar
        db.get('SELECT id, nome, whatsapp_connected, whatsapp_number FROM empresas WHERE id = 5', (err, row) => {
            if (row) {
                console.log(`📋 Empresa: ${row.nome} (ID: ${row.id})`);
                console.log(`📱 WhatsApp conectado: ${row.whatsapp_connected === 1 ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`📞 Número: ${row.whatsapp_number}`);
            }
            db.close();
        });
    }
});