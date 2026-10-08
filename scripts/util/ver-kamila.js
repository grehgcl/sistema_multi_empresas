const { db, getEmpresaDb } = require('./server/config/database');

async function buscarKamila() {
    console.log('🔍 Procurando Kamila em todas as empresas...\n');

    // Lista todas as empresas
    const empresas = await new Promise((resolve) => {
        db.all('SELECT id, nome FROM empresas', [], (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });

    console.log(`📋 Empresas encontradas: ${empresas.length}\n`);

    for (const empresa of empresas) {
        const empresaDb = getEmpresaDb(empresa.id);
        if (!empresaDb) continue;

        const resultado = await new Promise((resolve) => {
            empresaDb.all(
                `SELECT a.id, a.data, a.hora, a.status, a.lembrete_enviado, 
                        c.nome as cliente, a.servico
                 FROM agendamentos a 
                 LEFT JOIN clientes c ON a.cliente_id = c.id 
                 WHERE c.nome LIKE '%Kamila%'`,
                [],
                (err, rows) => {
                    if (err) resolve([]);
                    else resolve(rows || []);
                }
            );
        });

        if (resultado.length > 0) {
            console.log(`\n✅ ENCONTRADO na empresa ${empresa.id} (${empresa.nome}):`);
            console.table(resultado);
        }
    }

    console.log('\n✅ Fim.');
    process.exit(0);
}

buscarKamila();