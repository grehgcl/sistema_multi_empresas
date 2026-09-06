# 🗄️ BANCO DE DADOS — Tabelas e Operações

| Tabela | Operações | Arquivos que usam |
|---|---|---|
| `DIN` | UPDATE | server/routes/horarios.routes.js |
| `SET` | UPDATE | server.js |
| `acessos` | DELETE, INSERT, SELECT | server/routes/admin.routes.js, server/routes/auth.routes.js |
| `ads_stats` | CREATE, INSERT | server/config/migrations/ads_stats.sql, server/routes/admin.routes.js, server/routes/chatbot.routes.js |
| `agendamentos` | SELECT, DELETE, UPDATE, INSERT, CREATE | check-agendamento.js, delete-agendamento.js, server/jobs/lembretes-pagamento.js, server/jobs/lembretes.js, server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server/routes/clientes.routes.js, server/routes/fiados.routes.js, server/routes/financeiro.routes.js, server/routes/profissionais.routes.js, server/utils/helpers.js, server.js, verificar-agendamentos.js |
| `clientes` | DELETE, SELECT, CREATE, INSERT, UPDATE | server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server/routes/clientes.routes.js, server/routes/whatsapp.routes.js, verificar-agendamentos.js |
| `configuracoes` | SELECT, CREATE, INSERT, UPDATE | scripts/diagnostic-plans.js, server/routes/auth.routes.js, server/routes/pagamento.routes.js, server/routes/planos.routes.js, server.js |
| `despesas` | DELETE, CREATE, INSERT, UPDATE, SELECT | server/routes/admin.routes.js, server/routes/auth.routes.js, server/routes/despesas.routes.js, server/routes/financeiro.routes.js |
| `empresas` | UPDATE, SELECT, DELETE, INSERT | adicionar-slug-empresas.js, scripts/diagnostic-plans.js, server/jobs/reset-contador.js, server/middlewares/auth.js, server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server/routes/empresas.routes.js, server/routes/fiados.routes.js, server/routes/financeiro.routes.js, server/routes/pagamento.routes.js, server/routes/planos.routes.js, server/routes/whatsapp.routes.js, server/services/evolution-instances.js, server/services/whatsapp.js, server/utils/helpers.js, server.js, verificar-agendamentos.js |
| `encontrado` | CREATE | scripts/mapear-logica-completa.js |
| `horarios_funcionamento` | DELETE, SELECT, CREATE, INSERT, UPDATE | server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server/routes/empresas.routes.js, server/routes/horarios.routes.js |
| `if` | UPDATE | server/routes/profissionais.routes.js |
| `profissionais` | SELECT, DELETE, UPDATE, CREATE, INSERT | server/middlewares/auth.js, server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server/routes/empresas.routes.js, server/routes/profissionais.routes.js |
| `receitas` | CREATE, INSERT | server/routes/agendamentos.routes.js |
| `servicos` | DELETE, SELECT, CREATE, INSERT, UPDATE | server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server/routes/empresas.routes.js, server/routes/financeiro.routes.js, server/routes/servicos.routes.js |
| `sqlite_master` | SELECT | scripts/xray-project.js, server/routes/admin.routes.js, server/routes/agendamentos.routes.js, server/routes/chatbot.routes.js, verificar-agendamentos.js |
| `to` | UPDATE | package-lock.json |
| `transacoes_pagamento` | SELECT, INSERT, UPDATE, CREATE | scripts/diagnostic-plans.js, server/routes/pagamento.routes.js, server.js |
| `usuarios` | SELECT, DELETE, UPDATE, INSERT | scripts/diagnostic-plans.js, server/jobs/email-cron.js, server/routes/admin.routes.js, server/routes/auth.js, server/routes/auth.routes.js, server/routes/chatbot.routes.js, server.js |

## 📐 Schemas encontrados no código (CREATE TABLE)

### scripts/mapear-logica-completa.js:555
```sql
CREATE TABLE encontrado no código (tabelas só existem nos .db)_\n`;
```

### server/config/migrations/ads_stats.sql:2
```sql
CREATE TABLE IF NOT EXISTS ads_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    campanha TEXT NOT NULL,
    origem TEXT NOT NULL,
    tipo TEXT NOT NULL,
    cliente_id INTEGER,
    agendamento_id INTEGER,
    valor REAL DEFAULT 0,
    custo REAL DEFAULT 0,
    data_interacao TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
);
```

### server/routes/agendamentos.routes.js:1484
```sql
CREATE TABLE IF NOT EXISTS receitas (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                empresa_id INTEGER NOT NULL,
                                descricao TEXT NOT NULL,
                                valor REAL NOT NULL,
                                data TEXT NOT NULL,
                                forma_pagamento TEXT NOT NULL,
                                agendamento_id INTEGER,
                                status TEXT DEFAULT 'recebido',
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )`,
                            (err) => {
                                if (err) {
                                    console.error('❌ Erro ao criar tabela receitas:', err);
```

### server/routes/auth.routes.js:302
```sql
CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    telefone TEXT,
                    email TEXT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    bloqueado_chatbot INTEGER DEFAULT 0,
                    dias_bloqueio INTEGER DEFAULT 0,
                    grupos TEXT DEFAULT '[]',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);
```

### server/routes/auth.routes.js:314
```sql
CREATE TABLE IF NOT EXISTS servicos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    descricao TEXT,
                    valor REAL DEFAULT 0,
                    duracao INTEGER DEFAULT 30,
                    ativo INTEGER DEFAULT 1,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);
```

### server/routes/auth.routes.js:325
```sql
CREATE TABLE IF NOT EXISTS profissionais (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    senha TEXT NOT NULL,
                    comissao_percent INTEGER DEFAULT 30,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    ativo INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    telefone TEXT
                )`);
```

### server/routes/auth.routes.js:337
```sql
CREATE TABLE IF NOT EXISTS agendamentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER,
                    data TEXT,
                    hora TEXT,
                    servico_id INTEGER,
                    servico TEXT,
                    valor REAL DEFAULT 0,
                    duracao INTEGER DEFAULT 30,
                    status TEXT DEFAULT 'pendente',
                    comissao REAL DEFAULT 0,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    profissional_id INTEGER,
                    lembrete_enviado INTEGER DEFAULT 0,
                    valor_total REAL DEFAULT 0,
                    servicos_extras TEXT DEFAULT '[]',
                    valor_extras REAL DEFAULT 0,
                    forma_pagamento TEXT,
                    prazo_dias INTEGER,
                    data_vencimento TEXT,
                    descricao_pagamento TEXT,
                    lembrete_cobranca_enviado INTEGER DEFAULT 0,
                    lembrete_cobranca_enviado_em TEXT,
                    ultimo_lembrete_cobranca_tipo TEXT,
                    motivo_cancelamento TEXT,
      
```

### server/routes/auth.routes.js:368
```sql
CREATE TABLE IF NOT EXISTS despesas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    descricao TEXT NOT NULL,
                    categoria TEXT,
                    valor REAL DEFAULT 0,
                    data TEXT,
                    data_vencimento TEXT,
                    pago INTEGER DEFAULT 0,
                    forma_pagamento TEXT,
                    observacao TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);
```

### server/routes/auth.routes.js:382
```sql
CREATE TABLE IF NOT EXISTS horarios_funcionamento (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    dia_semana INTEGER,
                    aberto INTEGER DEFAULT 1,
                    hora_inicio TEXT DEFAULT '08:00',
                    hora_fim TEXT DEFAULT '18:00',
                    almoco_inicio TEXT DEFAULT '12:00',
                    almoco_fim TEXT DEFAULT '13:00',
                    intervalo_minutos INTEGER DEFAULT 30
                )`);
```

### server/routes/auth.routes.js:394
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chave TEXT UNIQUE,
                    valor TEXT,
                    payment_mode TEXT DEFAULT 'simulation',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);
```

### server/routes/pagamento.routes.js:53
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server/routes/pagamento.routes.js:60
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server/routes/planos.routes.js:21
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server/routes/planos.routes.js:28
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server.js:438
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server.js:445
```sql
CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server.js:488
```sql
CREATE TABLE IF NOT EXISTS transacoes_pagamento (
            id SERIAL PRIMARY KEY,
            empresa_id INTEGER NOT NULL,
            plano_id TEXT NOT NULL,
            plano_nome TEXT NOT NULL,
            valor REAL NOT NULL,
            metodo TEXT NOT NULL,
            pagamento_id TEXT NOT NULL,
            status TEXT NOT NULL,
            qr_code TEXT,
            qr_code_base64 TEXT,
            boleto_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS transacoes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            plano_id TEXT NOT NULL,
            plano_nome TEXT NOT NULL,
            valor REAL NOT NULL,
            metodo TEXT NOT NULL,
            pagamento_id TEXT NOT NULL,
            status TEXT NOT NULL,
            qr_code TEXT,
            qr_code_base64 TEXT,
            boleto_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

### server.js:503
```sql
CREATE TABLE IF NOT EXISTS transacoes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            plano_id TEXT NOT NULL,
            plano_nome TEXT NOT NULL,
            valor REAL NOT NULL,
            metodo TEXT NOT NULL,
            pagamento_id TEXT NOT NULL,
            status TEXT NOT NULL,
            qr_code TEXT,
            qr_code_base64 TEXT,
            boleto_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
```

