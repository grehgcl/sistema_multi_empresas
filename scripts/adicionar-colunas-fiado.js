const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/barbearia.db');

console.log('🔧 Adicionando colunas para sistema de fiado...');

db.exec(`
    -- Adicionar colunas para o sistema de fiado
    ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT DEFAULT '';
    ALTER TABLE agendamentos ADD COLUMN prazo_dias INTEGER DEFAULT 0;
    ALTER TABLE agendamentos ADD COLUMN data_vencimento TEXT DEFAULT '';
    ALTER TABLE agendamentos ADD COLUMN descricao_pagamento TEXT DEFAULT '';
    
    -- Criar tabela de lembretes de pagamento
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
        console.error('❌ Erro ao adicionar colunas:', err);
        process.exit(1);
    }

    console.log('✅ Colunas adicionadas com sucesso!');
    console.log('  - forma_pagamento');
    console.log('  - prazo_dias');
    console.log('  - data_vencimento');
    console.log('  - descricao_pagamento');
    console.log('✅ Tabela lembretes_pagamento criada!');

    db.close();
});