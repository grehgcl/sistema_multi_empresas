﻿=========================================
ESTRUTURA.md - SEE&AGENDE
ULTIMA ATUALIZACAO: 08/08/2026
=========================================

🚀 COMO EXECUTAR O PROJETO
-----------------------------------------
Modo Local (SQLite - Desenvolvimento)
npm start
Banco SQLite local (database/barbearia.db)
WhatsApp em modo LOG

Modo com WhatsApp Evolution (Envia mensagens reais!)
node -r dotenv/config server.js dotenv_config_path=.env.local
Banco PostgreSQL do Render ou VPS
WhatsApp Evolution REAL
Acesse: http://localhost:3000

📁 ESTRUTURA DE PASTAS
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
│           ├── dashboard.js              # Dashboard com Agenda Inteligente
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + GRUPOS + PROMOÇÕES + ÍNDICE A-Z ⭐
│           ├── agendamentos.js           # CRUD Agendamentos
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│           ├── financeiro.js             # FINANCEIRO COMPLETO COM TABS ⭐
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          # Configuracoes + Tema + Chatbot + DADOS EMPRESA
│           ├── planos.js                 # Página de Planos e Upgrade
│           └── whatsapp-config.js        # Configuração WhatsApp (Dono)
├── docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/
│   ├── config/
│   │   ├── database.js       # Conexão com banco + criação das tabelas
│   │   └── whatsapp.js       # Configuração do WhatsApp
│   ├── middlewares/
│   │   └── auth.js           # Middlewares de autenticação
│   ├── routes/               # 🔥 TODAS AS ROTAS EXTRAÍDAS (100%)
│   │   ├── index.js          # Centralizador de rotas
│   │   ├── auth.routes.js    # ✅ Login/Cadastro
│   │   ├── empresas.routes.js # ✅ Dados da empresa
│   │   ├── servicos.routes.js # ✅ CRUD Serviços
│   │   ├── horarios.routes.js # ✅ Horários de funcionamento
│   │   ├── profissionais.routes.js # ✅ CRUD Profissionais
│   │   ├── clientes.routes.js # ✅ CRUD Clientes + Grupos
│   │   ├── despesas.routes.js # ✅ CRUD Despesas
│   │   ├── agendamentos.routes.js # ✅ CRUD Agendamentos
│   │   ├── financeiro.routes.js # ✅ Financeiro
│   │   ├── admin.routes.js   # ✅ Super Admin
│   │   ├── whatsapp.routes.js # ✅ WhatsApp
│   │   ├── chatbot.routes.js # ✅ Chatbot
│   │   ├── pagamento.routes.js # ✅ Pagamentos
│   │   └── planos.routes.js  # ✅ Planos (Upgrade, cancelar)
│   ├── services/
│   │   ├── whatsapp.js       # Serviço de notificações WhatsApp (CORRIGIDO)
│   │   ├── evolution-instances.js # Gestão de instâncias WhatsApp (CORRIGIDO v2)
│   │   └── mercadopago.js    # Integração com MercadoPago
│   ├── jobs/
│   │   ├── lembretes.js      # Job automático de lembretes (09:00)
│   │   └── reset-contador.js # Job de reset de contadores
│   └── utils/
│       ├── constants.js      # Constantes (PLANOS, JWT_SECRET)
│       └── helpers.js        # Funções auxiliares
├── scripts/
│   ├── migrate.js            # Migração do banco
│   ├── seed.js               # População com dados iniciais
│   ├── migrate-vps.js        # Script principal de migração segura (VPS)
│   ├── migrate-whatsapp.js   # Migração WhatsApp (SQLite)
│   ├── migrate-whatsapp-pg.js # Migração WhatsApp (PostgreSQL)
│   └── migrar-usuarios-vps.js # Script para criar usuários na VPS
├── .env.dev                  # SQLite (desenvolvimento)
├── .env.local                # PostgreSQL (teste com dados reais)
├── atualizar.sh              # Script de atualização blindado da VPS ⭐
├── server.js                # Backend (REFATORADO - ~350 linhas)
└── package.json             # Dependências e scripts

=========================================
🔥 NOVIDADES (08/08/2026) - CORREÇÕES VPS
=========================================

### CORREÇÃO DO DASHBOARD E HORÁRIOS 🚀
- Criada tabela `horarios_funcionamento` no PostgreSQL
- Inseridos horários padrão para a empresa 14 (Segunda a Sábado, 08:00-18:00)
- Dashboard agora carrega os horários corretamente

### CORREÇÃO DE USUÁRIOS NA VPS 🛠️
- Script `migrar-usuarios-vps.js` criado para garantir usuários no PostgreSQL
- Usuários migrados do SQLite para o PostgreSQL
- Login funcionando com `luziasandraleal@hotmail.com / 123456`

### CORREÇÃO DO ERRO `payment_mode` 📱
- Adicionada coluna `payment_mode` na tabela `configuracoes`
- Erro `column "payment_mode" does not exist` corrigido

### REMOÇÃO DE DUPLICATA AUTOINCREMENT 🔧
- Removida segunda ocorrência da criação da tabela `configuracoes` no `server.js`
- Erro `syntax error at or near "AUTOINCREMENT"` corrigido

=========================================
🗄️ TABELAS DO BANCO
=========================================
Tabela                      Colunas principais                                          Status
empresas                    id, nome, plano, limite_profissionais, trial_expira,       ✅
                            assinatura_ativa, assinatura_valida_ate, agendamentos_mes,
                            mes_referencia, dias_bloqueio_geral, telefone_dono, endereco,
                            whatsapp_instance, whatsapp_connected, whatsapp_number,
                            whatsapp_connected_at, whatsapp_proprio_habilitado, created_at
usuarios                    id, nome, email, senha, role, empresa_id, telefone         ✅
profissionais               id, nome, email, senha, comissao_percent, empresa_id,      ✅
                            ativo, created_at, telefone
clientes                    id, nome, telefone, email, empresa_id,                     ✅
                            bloqueado_chatbot, dias_bloqueio, created_at
servicos                    id, nome, descricao, valor, duracao, ativo, empresa_id     ✅
agendamentos                id, cliente_id, data, hora, servico_id, servico, valor,    ✅
                            duracao, status, comissao, empresa_id, profissional_id,
                            lembrete_enviado, valor_total, servicos_extras, valor_extras
despesas                    id, empresa_id, descricao, categoria, valor, data,         ✅
                            data_vencimento, pago, forma_pagamento, observacao
horarios_funcionamento      id, empresa_id, dia_semana, aberto, hora_inicio,           ✅
                            hora_fim, almoco_inicio, almoco_fim
configuracoes               id, chave, valor, payment_mode, created_at, updated_at     ✅
acessos                     id, empresa_id, usuario_id, data_acesso, ip, user_agent    ✅

=========================================
📋 VARIAVEIS DE AMBIENTE
=========================================
.env (SQLite - Desenvolvimento)
NODE_ENV=development
RENDER=false
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=log

.env.local (PostgreSQL - Teste/Produção)
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
NODE_ENV=production
RENDER=false
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://163.176.218.131:8080
EVOLUTION_API_KEY=seeagende2024
EVOLUTION_INSTANCE=seeagende

=========================================
🚀 DEPLOY PARA VPS
=========================================
MÉTODO RECOMENDADO: GIT PULL COM BACKUP
ssh ubuntu@163.176.218.131 "cd ~/seeagende && cp .env /tmp/seeagende_env_backup && git pull origin main && cp /tmp/seeagende_env_backup .env && pm2 restart seeagende --update-env"

MÉTODO TRADICIONAL: SCP (ENVIO DE ARQUIVOS ESPECÍFICOS)
Enviar um arquivo específico
scp caminho/do/arquivo.js ubuntu@163.176.218.131:~/seeagende/caminho/do/arquivo.js

Enviar e reiniciar (comando completo)
scp public/js/pages/clientes.js ubuntu@163.176.218.131:~/seeagende/public/js/pages/ && ssh ubuntu@163.176.218.131 "cd ~/seeagende && pm2 restart seeagende --update-env"

COMANDOS ÚTEIS PARA DEPLOY
Verificar arquivos na VPS
ssh ubuntu@163.176.218.131 "ls -la ~/seeagende/public/js/pages/"

Ver logs do servidor
ssh ubuntu@163.176.218.131 "pm2 logs seeagende --lines 20"

Reiniciar servidor
ssh ubuntu@163.176.218.131 "pm2 restart seeagende --update-env"

=========================================
✅ STATUS DAS FUNCIONALIDADES
=========================================
Funcionalidade                     SQLite   PostgreSQL   Status
Login                              ✅       ✅           OK
Dashboard                          ✅       ✅           OK
Agenda Inteligente                 ✅       ✅           OK
Agendamentos (com extras)          ✅       ✅           OK
Despesas                           ✅       ✅           OK
Profissionais                      ✅       ✅           OK
Horários                           ✅       ✅           OK
Serviços                           ✅       ✅           OK
Financeiro com TABS                ✅       ✅           OK
Comparativo Mensal                 ✅       ✅           OK
Super Admin                        ✅       ✅           OK
Sistema de Acessos                 ✅       ✅           OK
WhatsApp Evolution                 LOG      REAL         OK
WhatsApp Multi-Instância (v2)      ✅       ✅           OK
Script de Atualização Blindado     ✅       ✅           OK
Grupos de Clientes                 ✅       ✅           OK
Promoções com Grupos               ✅       ✅           OK
Busca Mobile Otimizada             ✅       ✅           OK
Índice A-Z para Clientes           ✅       ✅           OK
Lupa removida no mobile            ✅       ✅           OK
Filtro de letra com localStorage   ✅       ✅           OK
Criação Auto. Instância (SA)       ✅       ✅           OK
Correção Query Booleana (VPS)      ✅       ✅           OK
WhatsApp Próprio com Nome Correto  ✅       ✅           OK
Envio WhatsApp no Agendamento      ✅       ✅           OK
Refatoração Backend                ✅       ✅           100% COMPLETA

=========================================
ULTIMA ATUALIZACAO: 08/08/2026
=========================================