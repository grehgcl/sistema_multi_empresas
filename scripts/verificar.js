const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('📊 Verificando agendamentos concluídos...\n');

db.all(`
    SELECT 
        a.id, 
        a.data, 
        a.servico, 
        a.valor, 
        a.valor_total, 
        a.comissao, 
        a.profissional_id,
        c.nome as cliente_nome,
        p.nome as profissional_nome
    FROM agendamentos a
    LEFT JOIN clientes c ON a.cliente_id = c.id
    LEFT JOIN profissionais p ON a.profissional_id = p.id
    WHERE a.status LIKE '%conclu%'
    ORDER BY a.data DESC
`, (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('⚠️ Nenhum agendamento concluído encontrado!');
    } else {
        console.log(`✅ ${rows.length} agendamentos concluídos encontrados:\n`);
        console.table(rows);

        // Contar com e sem profissional
        const comProf = rows.filter(r => r.profissional_id);
        const semProf = rows.filter(r => !r.profissional_id);
        console.log(`\n📊 Resumo:`);
        console.log(`   👨‍💼 Com profissional: ${comProf.length}`);
        console.log(`   👤 Sem profissional: ${semProf.length}`);
    }

    db.close();
});