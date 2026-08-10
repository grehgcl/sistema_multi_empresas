const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/barbearia.db');

console.log('🔧 Verificando colunas da tabela agendamentos...');

db.all('PRAGMA table_info(agendamentos)', (err, columns) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    const colunasExistentes = columns.map(c => c.name);
    console.log('📋 Colunas existentes:', colunasExistentes.join(', '));

    const colunasParaAdicionar = [
        { nome: 'forma_pagamento', tipo: "TEXT DEFAULT ''" },
        { nome: 'prazo_dias', tipo: "INTEGER DEFAULT 0" },
        { nome: 'data_vencimento', tipo: "TEXT DEFAULT ''" },
        { nome: 'descricao_pagamento', tipo: "TEXT DEFAULT ''" }
    ];

    let adicionadas = 0;

    colunasParaAdicionar.forEach(col => {
        if (!colunasExistentes.includes(col.nome)) {
            db.run(`ALTER TABLE agendamentos ADD COLUMN ${col.nome} ${col.tipo}`, (err) => {
                if (err) {
                    console.error(`❌ Erro ao adicionar ${col.nome}:`, err.message);
                } else {
                    console.log(`✅ Coluna ${col.nome} adicionada!`);
                    adicionadas++;
                }
            });
        } else {
            console.log(`✅ Coluna ${col.nome} já existe`);
        }
    });

    // Criar tabela de lembretes
    db.exec(`
        CREATE TABLE IF NOT EXISTS lembretes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agendamento_id INTEGER,
            empresa_id INTEGER,
            cliente_id INTEGER,
            data_vencimento TEXT,
            forma_pagamento TEXT,
            prazo_dias INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar lembretes_pagamento:', err);
        } else {
            console.log('✅ Tabela lembretes_pagamento criada/verificada!');
        }

        setTimeout(() => {
            db.close();
            console.log('🎉 Processo concluído! Reinicie o servidor.');
        }, 1000);
    });
});