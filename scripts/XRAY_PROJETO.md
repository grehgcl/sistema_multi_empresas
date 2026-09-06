# 🔬 RAIO-X DO PROJETO (X-RAY)

**Data:** 24/08/2026, 13:05:49
**Diretório:** C:\Users\jonat\Documents\barbearia_nova
**Git Branch:** `backup-sem-pwa` | **Último Commit:** b1e676d3 - feat: Super Admin em CARDS mobile + correção de agendamentos e clientes (3 days ago)

---

## 🧠 VISÃO GERAL E STACK
- **Frontend Detectado:** Font Awesome
- **Backend Base:** Node.js + Express
- **Banco de Dados:** barbaazul_29.db (8 tabelas mapeadas)
- **Funcionalidades:** ✅Auth | ✅WhatsApp | ✅Admin | ✅Financeiro | ✅Chatbot

---

## 🗄️ BANCO DE DADOS (ESQUEMA COMPLETO)
### Tabela: `clientes`
```sql
CREATE TABLE clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            empresa_id INTEGER,
            bloqueado_chatbot INTEGER DEFAULT 0,
            dias_bloqueio TEXT,
            grupos TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

### Tabela: `profissionais`
```sql
CREATE TABLE profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT,
            senha TEXT,
            comissao_percent REAL DEFAULT 0,
            empresa_id INTEGER,
            ativo INTEGER DEFAULT 1,
            telefone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

### Tabela: `servicos`
```sql
CREATE TABLE servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

### Tabela: `agendamentos`
```sql
CREATE TABLE agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            data TEXT NOT NULL,
            hora TEXT NOT NULL,
            servico_id INTEGER,
            servico TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            status TEXT DEFAULT 'agendado',
            comissao REAL DEFAULT 0,
            empresa_id INTEGER,
            profissional_id INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            valor_total REAL DEFAULT 0,
            servicos_extras TEXT,
            valor_extras REAL DEFAULT 0,
            forma_pagamento TEXT DEFAULT '',
            prazo_dias INTEGER DEFAULT 0,
            data_vencimento TEXT,
            descricao_pagamento TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

### Tabela: `despesas`
```sql
CREATE TABLE despesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            descricao TEXT,
            categoria TEXT,
            valor REAL DEFAULT 0,
            data TEXT,
            data_vencimento TEXT,
            pago INTEGER DEFAULT 0,
            forma_pagamento TEXT,
            observacao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        , anexo TEXT)
```

### Tabela: `horarios_funcionamento`
```sql
CREATE TABLE horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '08:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00',
            intervalo_minutos INTEGER DEFAULT 30
        , created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)
```

### Tabela: `lembretes_pagamento`
```sql
CREATE TABLE lembretes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agendamento_id INTEGER,
            empresa_id INTEGER,
            cliente_id INTEGER,
            data_vencimento TEXT,
            forma_pagamento TEXT,
            prazo_dias INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
```

### Tabela: `configuracoes`
```sql
CREATE TABLE configuracoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chave TEXT UNIQUE,
                    valor TEXT,
                    payment_mode TEXT DEFAULT 'simulation',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
```

---

## 🛣️ SERVER.JS - ROTAS E CONFIGURAÇÕES
### Rotas no arquivo principal:
- `GET    /manifest.json` 
- `GET    /sw.js` 
- `GET    /icons/:file` 
- `GET    /health` 
- `GET    /health` 

---

## 📁 ROTAS DA API (server/routes/)
- **admin.routes**
  - `GET /stats`
  - `GET /empresas`
  - `GET /empresas/:id`
  - `PUT /empresas/:id`
  - `DELETE /empresas/:id`
  - `GET /usuarios`
  - `GET /empresa/:id`
  - `GET /usuarios/:id`
  - `PUT /usuarios/:id`
  - `GET /faturamento-mensal`
  - `GET /crescimento-empresas`
  - `GET /empresas/:id/usuarios`
  - `GET /empresas/:id/acessos`
  - `GET /empresas/:id/clientes`
  - `GET /empresas/:id/agendamentos`
  - `POST /empresas/:id/extender-trial`
  - `GET /empresas/estatisticas`
  - `GET /empresas/:id`
  - `PUT /profissionais/:id`
  - `GET /profissionais/:id`
  - `GET /acessos`
  - `GET /planos-config`
  - `PUT /planos-config`
  - `POST /registrar-acesso`
  - `PUT /empresas/:id/whatsapp-proprio`
- **agendamentos.routes**
  - `GET /`
  - `GET /:id`
  - `POST /`
  - `PUT /:id`
  - `PUT /:id/concluir`
  - `PUT /:id/confirmar`
  - `PUT /:id/cancelar`
  - `DELETE /:id`
  - `PUT /:id/extras`
  - `GET /periodo`
  - `GET /horarios-disponiveis`
  - `GET /profissionais-disponiveis`
  - `PUT /:id/pagamento`
  - `POST /:id/enviar-cobranca`
- **auth.routes**
  - `POST /login`
  - `POST /cadastro`
  - `POST /verificar`
- **chatbot.routes**
  - `GET /link/:empresaId`
  - `GET /empresa/:id`
  - `GET /servicos/:empresaId`
  - `GET /profissionais/:empresaId`
  - `GET /dono/:empresaId`
  - `POST /cliente/buscar`
  - `POST /cliente/criar`
  - `POST /datas-disponiveis-mes`
  - `POST /horarios-disponiveis`
  - `POST /agendar`
  - `GET /servico/:id`
- **clientes.routes**
  - `GET /paginated`
  - `GET /`
  - `GET /grupos`
  - `GET /:id`
  - `GET /:id/grupos`
  - `POST /`
  - `PUT /:id`
  - `DELETE /:id`
  - `PUT /:id/bloquear-chatbot`
  - `PUT /:id/grupos`
  - `POST /bulk`
  - `GET /stats`
- **despesas.routes**
  - `GET /`
  - `GET /resumo`
  - `GET /categorias`
  - `GET /:id`
  - `POST /`
  - `PUT /:id`
  - `DELETE /:id`
- **empresas.routes**
  - `GET /plano`
  - `GET /dados`
  - `GET /dados-completos`
  - `PUT /dados`
  - `PUT /endereco`
  - `PUT /telefone-dono`
  - `PUT /bloqueio-geral`
  - `PUT /bloqueio-geral`
- **fiados.routes**
  - `GET /`
  - `PUT /:id/baixar`
  - `GET /stats`
- **financeiro.routes**
  - `GET /`
  - `GET /comparativo`
  - `GET /receitas`
  - `GET /analise-diaria`
  - `GET /despesas/:id`
  - `DELETE /:id`
  - `GET /fiados`
  - `PUT /fiados/:id/baixar`
  - `GET /fiados/stats`
  - `PUT /fiados/:id/baixar`
  - `POST /receitas/manual`
  - `DELETE /receitas/manual/:id`
- **horarios.routes**
  - `GET /`
  - `PUT /:dia`
  - `POST /`
  - `POST /inicializar`
- **pagamento.routes**
  - `GET /config`
  - `PUT /config`
  - `GET /status`
  - `POST /simulate-payment`
  - `POST /simulate-pix`
  - `POST /simulate-card`
  - `POST /simulate-boleto`
  - `POST /confirm-simulated-payment/:paymentId`
  - `POST /mercadopago/webhook`
  - `POST /create-boleto`
  - `POST /create-pix`
  - `POST /create-payment`
  - `POST /webhook`
- **planos.routes**
  - `GET /empresa`
  - `GET /`
  - `GET /empresa`
  - `PUT /empresa`
  - `POST /admin/ativar-whatsapp/:id`
  - `POST /upgrade`
  - `POST /cancel-subscription`
- **profissionais.routes**
  - `GET /`
  - `GET /:id`
  - `POST /`
  - `PUT /:id`
  - `POST /:id/reset-senha`
  - `DELETE /:id`
  - `GET /profissional/agendamentos`
  - `GET /profissional/financeiro`
  - `PUT /profissional/agendamentos/:id`
  - `PUT /profissional/agendamentos/:id/concluir`
- **servicos.routes**
  - `GET /`
  - `GET /todos`
  - `POST /`
  - `PUT /:id`
  - `DELETE /:id`
- **whatsapp.routes**
  - `GET /info`
  - `POST /criar-instancia`
  - `GET /qrcode`
  - `GET /status`
  - `POST /disconnect`
  - `POST /contatos`
  - `GET /contatos`
  - `GET /admin/empresas/whatsapp-status`
  - `PUT /admin/empresas/:id/whatsapp-proprio`
  - `POST /webhook`
  - `GET /webhook`
  - `POST /enviar`

---

## ⚙️ SERVICES (server/services/)
- **email**
- **evolution-instances** → [`EvolutionInstances`]
- **evolution-websocket** → [`EvolutionWebSocket`]
- **mercadopago** → [`MercadoPagoService`]
- **whatsapp**

---

## 🌐 PASTA PUBLIC/ (FRONTEND)
**Estatísticas:** 2 HTML | 16 JS | 15 CSS

### Páginas e dependências de API:
#### chatbot.html
- **Título:** Agendamento Inteligente - Barbearia Pro

#### index.html
- **Título:** See&Agende - Gestão para Salões, Barbearias e Estéticas
- **Chamadas API:**
  - `/api/auth/login`
  - `/api/auth/cadastro`

---

## 🔐 VARIÁVEIS DE AMBIENTE (.ENV)
### .env
- NODE_ENV=development
- RENDER=false
- WHATSAPP_ENABLED=true
- WHATSAPP_PROVIDER=evolution
- EVOLUTION_API_URL=http://179.199.134.127:8080
- EVOLUTION_API_KEY=***OCULTO***
- JWT_SECRET=***OCULTO***
- PORT=3000
- TZ=America/Sao_Paulo
- BASE_URL=http://localhost:3000
- PAYMENT_MODE=sandbox

### .env.example
- PORT=3000
- NODE_ENV=development
- JWT_SECRET=***OCULTO***
- DATABASE_URL=postgresql://usuario:senha@localhost:5432/barbearia
- RENDER=false
- RENDER_URL=http://localhost:3000
- MERCADO_PAGO_ACCESS_TOKEN=***OCULTO***
- MERCADO_PAGO_PUBLIC_KEY=***OCULTO***
- STRIPE_SECRET_KEY=***OCULTO***
- STRIPE_PUBLIC_KEY=***OCULTO***
- WEBHOOK_SECRET=***OCULTO***

---

## 🧹 INDICADORES DE QUALIDADE (CODE SMELLS)
- **Total de arquivos JS escaneados:** 63
- **Console.logs encontrados:** 921 ⚠️ (ALTO - Remover antes de prod)
- **TODOs no código:** 1

---
