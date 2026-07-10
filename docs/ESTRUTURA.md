﻿=========================================
  ESTRUTURA.md - SEE&AGENDE
  ULTIMA ATUALIZACAO: 10/07/2026
=========================================

🚀 COMO EXECUTAR O PROJETO
=========================================

Modo Local (SQLite - Desenvolvimento)
-----------------------------------------
npm start

- Banco SQLite local (database/barbearia.db)
- WhatsApp em modo LOG

Modo com WhatsApp Evolution (Envia mensagens reais!)
-----------------------------------------
node -r dotenv/config server.js dotenv_config_path=.env.local

- Banco PostgreSQL do Render
- WhatsApp Evolution REAL
- Acesse: http://localhost:3000

📁 ESTRUTURA DE PASTAS
=========================================

├── database/
│   └── barbearia.db          # SQLite (desenvolvimento local)
├── public/
│   ├── index.html            # Landing Page + Frontend principal
│   ├── chatbot.html          # Página do Chatbot Inteligente
│   ├── css/
│   │   ├── style.css         # Estilos premium com tema escuro
│   │   └── chatbot.css       # Estilos específicos do chatbot
│   └── js/
│       ├── ui.js             # UI Global (toasts, loading, modal)
│       └── pages/
│           ├── dashboard.js              # Dashboard com AGENDA INTELIGENTE (CORRIGIDO)
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + DIAS_BLOQUEIO
│           ├── agendamentos.js           # CRUD Agendamentos (CORRIGIDO)
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│           ├── financeiro.js             # Financeiro (CORRIGIDO)
│           ├── empresas.js               # Gestao empresas (Super Admin) - COMPLETO
│           ├── configuracoes.js          # Configuracoes + Tema + Chatbot + BLOQUEIO GERAL
│           ├── planos.js                 # Página de Planos e Upgrade
│           └── whatsapp-config.js        # NOVO: Configuração WhatsApp (Dono)
├── docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/
│   ├── config/
│   │   ├── database.js      # Conexão com banco + criação das tabelas + MIGRAÇÕES
│   │   └── whatsapp.js      # Configuração do WhatsApp (provider, API keys)
│   ├── middlewares/
│   │   └── auth.js          # Middlewares de autenticação + LIMITE AGENDAMENTOS
│   ├── services/
│   │   ├── whatsapp.js      # Serviço de notificações WhatsApp (EVOLUTION API)
│   │   └── evolution-instances.js  # NOVO: Serviço de gestão de instâncias
│   ├── jobs/
│   │   ├── lembretes.js     # Job automático de lembretes (09:00)
│   │   └── reset-contador.js # Job de reset de contadores
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares
├── scripts/
│   ├── migrate.js           # Migração do banco
│   ├── seed.js              # População com dados iniciais
│   ├── migrate-limite-agendamentos.js # Migração para limite
│   ├── migrate-dias-bloqueio.js # Migração para dias_bloqueio individual
│   ├── migrate-whatsapp.js       # NOVO: Migração WhatsApp (SQLite)
│   ├── migrate-whatsapp-pg.js    # NOVO: Migração WhatsApp (PostgreSQL)
│   ├── migrate-whatsapp-habilitado.js # NOVO: Migração campo habilitado
│   ├── corrigir-booleanos.js     # Correção de booleanos
│   ├── corrigir-tofixed.js       # Correção de toFixed
│   └── corrigir-placeholders.js  # Correção de placeholders
├── .render/
│   └── start.sh             # Script de inicialização no Render
├── keep_alive.js            # Mantém o servidor ativo
├── cron.js                  # Job alternativo para manter servidor ativo
├── render.yaml              # Configuração de deploy no Render
├── .env.example             # Exemplo de variáveis de ambiente
├── .env.local               # Configuração local com WhatsApp Evolution
├── package.json             # Dependências e scripts
├── README.md                # Documentação do projeto
├── test-limite.js           # Script para testar limite
└── server.js                # Backend completo + rotas

=========================================
🔥 NOVIDADES (10/07/2026) - WHATSAPP MULTI-INSTÂNCIA
=========================================

1. WHATSAPP EVOLUTION - SISTEMA MULTI-INSTÂNCIA 📱
-----------------------------------------
- Provedor: Evolution API (servidor externo: http://163.176.218.131:8080)
- Instância Padrão: seeagende (usado por empresas sem WhatsApp próprio)
- Instância Própria: Cada empresa Business/Enterprise pode ter sua própria instância
- Confirmação de Agendamento: Enviada automaticamente ao criar
- Lembrete 24h: Job automático às 09:00
- Cancelamento: Notifica o cliente
- Conclusão: Agradecimento automático
- Telefone do Dono: Aparece em todas as mensagens
- Formatação: Telefone formatado como (XX) XXXXX-XXXX
- Endereço: Aparece nas mensagens
- Arquivos: server/services/whatsapp.js, server/services/evolution-instances.js, server.js

2. NOVOS CAMPOS NO BANCO
-----------------------------------------
-- Tabela empresas (adicionados em 10/07/2026)
whatsapp_instance VARCHAR(100)              -- Nome da instância na Evolution
whatsapp_connected BOOLEAN DEFAULT FALSE    -- Status de conexão
whatsapp_number VARCHAR(20)                 -- Número conectado
whatsapp_connected_at TIMESTAMP             -- Data da última conexão
whatsapp_proprio_habilitado BOOLEAN DEFAULT FALSE  -- Controle do Super Admin

3. SUPER ADMIN - CONTROLE WHATSAPP 🏢
-----------------------------------------
- Coluna 💬 WhatsApp na lista de empresas
- 3 estados: 🔴 OFF, 🟡 PEND, 🟢 ON, 🔒 [plano]
- Habilitar/desabilitar WhatsApp próprio de cada empresa
- Status WhatsApp de todas empresas

4. DONO - WHATSAPP EXCLUSIVO 👨‍💼
-----------------------------------------
3 cenários:
- Plano não permite (Trial/Starter/Pro) → Tela de upgrade
- Plano permite mas Super Admin não habilitou → "Aguarde o administrador"
- Tudo OK → Pode criar instância e conectar WhatsApp

Funcionalidades:
- Criar instância na Evolution API
- Escanear QR Code com WhatsApp pessoal
- Ver status de conexão
- Desconectar WhatsApp

=========================================
🔥 CORREÇÕES RECENTES (06/07/2026)
=========================================

1. MIDDLEWARES CORRIGIDOS 📊
-----------------------------------------
- verificarAcessoAgendamentos: Suporte a true/false e 1/0
- verificarLimiteProfissionais: Placeholders corrigidos para PostgreSQL
- verificarLimiteAgendamentos: Funcionando corretamente

2. ROTAS CORRIGIDAS 🔧
-----------------------------------------
- GET /api/despesas: Placeholders PostgreSQL corrigidos
- GET /api/horarios: Conversão de booleanos
- POST /api/agendamentos: Validação de assinatura ativa
- PUT /api/profissionais/:id: Counter corrigido

3. FRONTEND CORRIGIDO 🎨
-----------------------------------------
- configuracoes.js: Status de profissionais e horários
- agendamentos.js: Preservação de horário ao selecionar serviço
- financeiro.js: parseFloat antes de toFixed
- dashboard.js: Compatibilidade com booleanos

4. SCRIPT DE CORREÇÃO 📝
-----------------------------------------
- corrigir-booleanos.js: Converte 0/1 para true/false
- corrigir-tofixed.js: Adiciona parseFloat antes de toFixed
- corrigir-placeholders.js: Corrige placeholders PostgreSQL

=========================================
🗄️ TABELAS DO BANCO
=========================================

Tabela                      Colunas principais                                          Status
empresas                    id, nome, plano, limite_profissionais, trial_expira,       ✅
                            assinatura_ativa, assinatura_valida_ate, ultima_cobranca,
                            agendamentos_mes, mes_referencia, dias_bloqueio_geral,
                            telefone_dono, endereco, whatsapp_instance,
                            whatsapp_connected, whatsapp_number, whatsapp_connected_at,
                            whatsapp_proprio_habilitado, created_at
usuarios                    id, nome, email, senha, role, empresa_id, telefone         ✅
profissionais               id, nome, email, senha, comissao_percent, empresa_id,      ✅
                            ativo, created_at, telefone
clientes                    id, nome, telefone, email, empresa_id,                     ✅
                            bloqueado_chatbot, dias_bloqueio, created_at
servicos                    id, nome, descricao, valor, duracao, ativo, empresa_id    ✅
agendamentos                id, cliente_id, data, hora, servico_id, servico, valor,   ✅
                            status, comissao, empresa_id, profissional_id,
                            lembrete_enviado
despesas                    id, empresa_id, descricao, categoria, valor, data,         ✅
                            data_vencimento, pago, forma_pagamento, observacao
horarios_funcionamento      id, empresa_id, dia_semana, aberto, hora_inicio,           ✅
                            hora_fim, almoco_inicio, almoco_fim, intervalo_minutos
acessos                     id, empresa_id, usuario_id, data_acesso, ip, user_agent   ✅

=========================================
📋 VARIAVEIS DE AMBIENTE
=========================================

.env (SQLite - Desenvolvimento)
-----------------------------------------
NODE_ENV=development
RENDER=false
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=log

.env.local (PostgreSQL - Teste)
-----------------------------------------
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
NODE_ENV=development
RENDER=true
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://163.176.218.131:8080
EVOLUTION_API_KEY=seeagende2024
EVOLUTION_INSTANCE=seeagende

=========================================
✅ STATUS DAS FUNCIONALIDADES
=========================================

Funcionalidade           SQLite   PostgreSQL   Status
Login                    ✅       ✅           OK
Dashboard                ✅       ✅           OK
Agenda Inteligente       ✅       ✅           OK
Agendamentos             ✅       ✅           OK
Despesas                 ✅       ✅           OK
Profissionais            ✅       ✅           OK
Horários                 ✅       ✅           OK
Serviços                 ✅       ✅           OK
Financeiro               ✅       ✅           OK
Configurações            ✅       ✅           OK
Super Admin              ✅       ✅           OK
Sistema de Acessos       ✅       ✅           OK
WhatsApp Evolution       LOG      REAL         OK
WhatsApp Multi-Instância ✅       ✅           NOVO!

=========================================
ULTIMA ATUALIZACAO: 10/07/2026
=========================================