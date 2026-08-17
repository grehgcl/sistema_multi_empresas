// scripts/corrigir-despesas-null.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// Buscar todas as empresas
db.all('SELECT id FROM empresas', [], (err, empresas) => {
    if (err) {
        console.error('❌ Erro:', err);
        return;
    }
    
    empresas.forEach(empresa => {
        const empresaId = empresa.id;
        const dbEmpresa = new sqlite3.Database(./database/empresa_.db);
        
        // Verificar despesas com ID null
        dbEmpresa.all('SELECT rowid, * FROM despesas WHERE id IS NULL', [], (err, rows) => {
            if (err) {
                console.error(❌ Erro na empresa :, err);
                return;
            }
            
            if (rows.length > 0) {
                console.log(📊 Empresa :  despesas com ID null);
                
                rows.forEach(row => {
                    // Atualizar o ID usando rowid
                    dbEmpresa.run(
                        'UPDATE despesas SET id = ? WHERE rowid = ?',
                        [row.rowid, row.rowid],
                        function(err) {
                            if (err) {
                                console.error(❌ Erro ao corrigir despesa :, err);
                            } else {
                                console.log(✅ Corrigido: despesa  -> ID );
                            }
                        }
                    );
                });
            } else {
                console.log(✅ Empresa : nenhuma despesa com ID null);
            }
            
            dbEmpresa.close();
        });
    });
    
    setTimeout(() => {
        db.close();
        console.log('✅ Correção concluída!');
    }, 5000);
});
