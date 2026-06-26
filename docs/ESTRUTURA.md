﻿# ESTRUTURA DO PROJETO - Atualizada em 24/06/2026

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
│           ├── dashboard.js              # Dashboard com AGENDA INTELIGENTE
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + DIAS_BLOQUEIO
│           ├── agendamentos.js           # CRUD Agendamentos
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│           ├── financeiro.js             # Financeiro
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          # Configuracoes + Tema + Chatbot + BLOQUEIO GERAL
│           └── planos.js                 # Página de Planos e Upgrade
├── docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/
│   ├── config/
│   │   └── database.js      # Conexão com banco + criação das tabelas
│   ├── middlewares/
│   │   └── auth.js          # Middlewares de autenticação + LIMITE AGENDAMENTOS
│   ├── services/
│   │   └── whatsapp.js      # Serviço de notificações WhatsApp
│   ├── jobs/
│   │   ├── lembretes.js     # Job automático de lembretes
│   │   └── reset-contador.js # Job de reset de contadores
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares
├── scripts/
│   ├── migrate.js           # Migração do banco
│   ├── seed.js              # População com dados iniciais
│   ├── migrate-limite-agendamentos.js # Migração para limite
│   └── migrate-dias-bloqueio.js # Migração para dias_bloqueio individual
├── .render/
│   └── start.sh             # Script de inicialização no Render
├── keep_alive.js            # Mantém o servidor ativo
├── cron.js                  # Job alternativo para manter servidor ativo
├── render.yaml              # Configuração de deploy no Render
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── README.md                # Documentação do projeto
├── test-limite.js           # Script para testar limite
└── server.js                # Backend completo + rotas

## TEMA ESCURO
- O sistema inicia com tema escuro por padrão
- Toggle disponível nas Configurações > Tema
- Estilo Instagram com transições suaves
- Salvo automaticamente no localStorage

## AGENDA INTELIGENTE
- Card da Agenda dentro do Dashboard (abaixo de Ações Rápidas)
- Visualização semanal com grade de horários (08:00 às 18:00)
- Cada profissional tem uma cor única (Dono = dourado 👑)
- Clique na bolinha colorida abre modal com data/hora pré-setados
- Cores: 🟢 Disponível, 🔴 Ocupado, 🍽️ Almoço, 🔒 Fechado
- Legenda de cores no topo do card

## DIAS_BLOQUEIO INDIVIDUAL POR CLIENTE
- Campo `dias_bloqueio` na tabela `clientes` (padrão = 1)
- Dono configura no modal de edição do cliente
- 1 dia = não pode agendar 2 vezes no mesmo dia
- 7 dias = só pode agendar 1 vez por semana
- 0 dias = sem restrição

## BLOQUEIO GERAL (NOVO!)
- Configuração COLETIVA (afeta TODOS os clientes)
- Dono configura nas Configurações > Bloqueio Geral
- Opções: 0, 7, 14, 30 dias
- Campo na tabela empresas: `dias_bloqueio_geral` (INTEGER DEFAULT 0)
- REGRA FIXA: Cliente NÃO pode fazer mais de 1 agendamento por dia
- Chatbot respeita o bloqueio geral

## LIMITE DE AGENDAMENTOS
- Starter e Trial: 100 agendamentos/mês
- Pro, Business, Enterprise: Ilimitado
- Contador agendamentos_mes e mes_referencia no banco
- Reset automático no início de cada mês
- Bloqueio ao atingir o limite
- Aplicado tanto no sistema manual quanto no chatbot

## VARIAVEIS GLOBAIS (localStorage)
- token: JWT do usuario logado
- usuario: { id, nome, email, role, empresa_id, comissao_percent? }
- theme: 'dark' | 'light' - tema atual do sistema

## VARIAVEIS DE AMBIENTE (.env)
- NODE_ENV: production / development
- RENDER: true / false (identifica ambiente Render)
- DATABASE_URL: URL do PostgreSQL (apenas produção)
- PORT: 3000 (padrão)
- JWT_SECRET: Chave secreta para JWT
- RENDER_EXTERNAL_URL: URL pública do serviço

## FUNCOES GLOBAIS UI (ui.js)
- showToast(msg, type): Exibe notificacao toast
- showLoading(): Mostra loading spinner
- hideLoading(): Esconde loading spinner
- showModal(title, content, callback): Modal customizado

## FLUXO DE TELAS POR ROLE

### Super Admin
- Dashboard (stats globais)
- Empresas (listar, editar, estender trial)
- Financeiro Global (todas comissoes)

### Dono
- Dashboard (stats da empresa, gráficos, métricas + AGENDA INTELIGENTE)
- Agendamentos (CRUD com filtros, edicao, horarios 30/30min)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD + bloqueio chatbot + WhatsApp + DIAS_BLOQUEIO)
- Configuracoes (Profissionais + Horarios + Chatbot + Tema + BLOQUEIO GERAL)
- Planos (Visualizar planos e fazer upgrade)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir)
- Minhas Comissoes (suas comissoes)

## ROTAS ADICIONADAS (NOVAS)
- GET /api/empresa/dados - Busca dados da empresa (com dias_bloqueio_geral)
- PUT /api/empresa/bloqueio-geral - Atualiza o bloqueio geral

=========================================
ULTIMA ATUALIZACAO: 24/06/2026
=========================================