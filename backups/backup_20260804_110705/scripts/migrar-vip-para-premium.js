// scripts/migrar-vip-para-premium.js
// Executar com: node scripts/migrar-vip-para-premium.js

const { db } = require('../server/config/database');

async function migrarVIPparaPremium() {
    console.log('🔄 Migrando VIP para Premium...');

    const isPg = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    try {
        // Busca todos os clientes que têm o grupo VIP
        let sql = isPg
            ? `SELECT id, nome, grupos FROM clientes WHERE grupos::text LIKE '%VIP%'`
            : `SELECT id, nome, grupos FROM clientes WHERE grupos LIKE '%VIP%'`;

        const clientes = await new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Encontrados ${clientes.length} clientes com grupo VIP`);

        if (clientes.length === 0) {
            console.log('✅ Nenhum cliente com VIP para migrar');
            return;
        }

        let atualizados = 0;

        for (let cliente of clientes) {
            let grupos = [];
            try {
                grupos = typeof cliente.grupos === 'string' ? JSON.parse(cliente.grupos) : cliente.grupos;
                if (!Array.isArray(grupos)) grupos = [];
            } catch {
                grupos = [];
            }

            // Substitui VIP por Premium
            const novosGrupos = grupos.map(g => g === 'VIP' ? 'Premium' : g);

            // Se mudou, atualiza
            if (JSON.stringify(grupos) !== JSON.stringify(novosGrupos)) {
                const updateSql = isPg
                    ? `UPDATE clientes SET grupos = $1::jsonb WHERE id = $2`
                    : `UPDATE clientes SET grupos = ? WHERE id = ?`;

                await new Promise((resolve, reject) => {
                    db.run(updateSql, [JSON.stringify(novosGrupos), cliente.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                atualizados++;
                console.log(`✅ Cliente ${cliente.nome} (ID: ${cliente.id}) atualizado: VIP → Premium`);
            }
        }

        console.log(`✅ ${atualizados} clientes migrados com sucesso!`);

    } catch (error) {
        console.error('❌ Erro na migração:', error);
    }
}

// Executa a migração
migrarVIPparaPremium();