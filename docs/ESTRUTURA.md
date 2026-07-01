﻿========================================
ULTIMA ATUALIZACAO: 01/07/2026
=========================================

text

---

## 📄 ESTRUTURA.md

```markdown
# ESTRUTURA DO PROJETO - Atualizada em 01/07/2026

## 🚀 COMO EXECUTAR O PROJETO

### Modo Local (Sem WhatsApp real - apenas LOG)
```bash
npm start
Usa o arquivo .env padrão

WhatsApp em modo LOG

Banco SQLite local

Acesse: http://localhost:3000

Modo com WhatsApp Evolution (Envia mensagens reais!)
bash
node -r dotenv/config server.js dotenv_config_path=.env.local
Usa o arquivo .env.local

WhatsApp Evolution conectado ao servidor externo (163.176.218.131:8080)

Banco SQLite local

Envia mensagens reais para os clientes

Acesse: http://localhost:3000

text
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
│           ├── agendamentos.js           # CRUD Agendamentos
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│           ├── financeiro.js             # Financeiro
│           ├── empresas.js               # Gestao empresas (Super Admin) - COMPLETO
│           ├── configuracoes.js          # Configuracoes + Tema + Chatbot + BLOQUEIO GERAL
│           └── planos.js                 # Página de Planos e Upgrade
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
│   │   └── whatsapp.js      # Serviço de notificações WhatsApp (EVOLUTION API)
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
│   └── migrate-dias-bloqueio.js # Migração para dias_bloqueio individual
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

## 🔥 NOVIDADES (01/07/2026)

### 1. WHATSAPP EVOLUTION - SISTEMA COMPLETO 📱
- **Provedor:** Evolution API (servidor externo: http://163.176.218.131:8080)
- **Confirmação de Agendamento:** Enviada automaticamente ao criar
- **Lembrete 24h:** Job automático às 09:00
- **Cancelamento:** Notifica o cliente
- **Conclusão:** Agradecimento automático
- **Telefone do Dono:** Aparece em todas as mensagens
- **Formatação:** Telefone formatado como (XX) XXXXX-XXXX
- **Endereço:** Aparece nas mensagens
- **Arquivos:** `server/services/whatsapp.js`, `server/config/whatsapp.js`

### 2. SUPER ADMIN COMPLETO 🏢
- **Arquivo:** `public/js/pages/empresas.js`
- **Funcionalidades:**
  - Dashboard com cards de métricas
  - Lista de todas as empresas com status do trial
  - Ver detalhes completos da empresa
  - Editar nome e plano da empresa
  - Estender trial (+30 dias)
  - Gerenciar usuários (editar nome, email, telefone, role, senha, comissão)
  - Filtrar empresas por nome
  - Alertas de trials prestes a vencer

### 3. SISTEMA DE ACESSOS 📊
- **Arquivo:** `server.js` e `server/config/database.js`
- **Funcionalidades:**
  - Registro automático de acessos no login
  - Captura de IP e User-Agent
  - Estatísticas por empresa (total, hoje, semana, mês)
  - Último acesso com data/hora formatada
  - Tabela `acessos` no banco de dados

### 4. ROTAS DO SUPER ADMIN (NOVAS)
- GET `/api/admin/stats` - Estatísticas gerais
- GET `/api/admin/empresas` - Listar empresas com métricas
- GET `/api/admin/empresas/estatisticas` - Estatísticas completas
- GET `/api/admin/usuarios` - Listar todos os usuários
- GET `/api/admin/empresas/:id` - Detalhes da empresa
- GET `/api/admin/empresas/:id/usuarios` - Usuários da empresa
- GET `/api/admin/empresas/:id/clientes` - Clientes da empresa
- GET `/api/admin/empresas/:id/agendamentos` - Agendamentos da empresa
- GET `/api/admin/empresas/:id/acessos` - Acessos da empresa
- PUT `/api/admin/empresas/:id` - Atualizar empresa
- GET `/api/admin/usuarios/:id` - Buscar usuário
- PUT `/api/admin/usuarios/:id` - Atualizar usuário
- GET `/api/admin/profissionais/:id` - Buscar profissional
- PUT `/api/admin/profissionais/:id` - Atualizar profissional
- POST `/api/admin/empresas/:id/extender-trial` - Estender trial

## 🔥 CORREÇÕES RECENTES (01/07/2026)

### 1. WHATSAPP - TELEFONE DO DONO NAS MENSAGENS 📱
- **Adicionado:** Campo `telefone_dono` na tabela `empresas`
- **Adicionado:** Campo `endereco` na tabela `empresas`
- **Funcionalidade:** O telefone do dono aparece automaticamente nas mensagens
- **Formatação:** Telefone formatado como (XX) XXXXX-XXXX

### 2. CORREÇÃO DE TIMEZONE NAS DATAS 🌐
- **Arquivo:** `public/js/pages/dashboard.js`
- **Função:** `abrirAgendamentoInteligente()`
- **Mudança:** Data enviada com +1 dia para compensar UTC
- **Resultado:** Data correta no modal e no banco

### 3. RECARREGAMENTO DA AGENDA INTELIGENTE 🔄
- **Arquivo:** `public/js/pages/dashboard.js`
- **Função:** `window.forcarRecarregarAgenda()`
- **Mudança:** Força recarregamento da agenda após agendamento
- **Resultado:** Bolinha fica vermelha imediatamente

### 4. DESIGN MODERNO DA AGENDA 🎨
- Gradientes e sombras modernas
- Efeito pulse nas bolinhas
- Tamanho adaptativo
- Tooltips ricos
- Barra de progresso do dia
- Ícones nos horários
- Mini avatar dos profissionais
- Indicador de scroll
- Navegação ◀◀ ◀ ▶ ▶▶

### 5. SEMANA COMEÇANDO NO DIA ATUAL 📅
- A agenda sempre começa no dia atual
- Navegação preserva a semana selecionada

## TEMA ESCURO
- O sistema inicia com tema escuro por padrão
- Toggle disponível nas Configurações > Tema
- Estilo Instagram com transições suaves
- Salvo automaticamente no localStorage

## AGENDA INTELIGENTE (CORRIGIDA)
- Card da Agenda dentro do Dashboard (abaixo de Ações Rápidas)
- Visualização semanal com grade de horários (08:00 às 18:00)
- Cada profissional tem uma cor única (Dono = dourado 👑)
- Clique na bolinha colorida abre modal com data/hora pré-setados
- Cores: 🟢 Disponível, 🔴 Ocupado, 🍽️ Almoço, 🔒 Fechado
- Legenda de cores no topo do card
- **NOVO:** Recarrega automaticamente após agendamento
- **NOVO:** Correção de timezone nas datas

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

## VARIAVEIS DE AMBIENTE (.env.local) - WhatsApp Evolution
- WHATSAPP_ENABLED: true
- WHATSAPP_PROVIDER: evolution
- EVOLUTION_API_URL: http://163.176.218.131:8080
- EVOLUTION_API_KEY: seeagende2024
- EVOLUTION_INSTANCE: seeagende

## FUNCOES GLOBAIS UI (ui.js)
- showToast(msg, type): Exibe notificacao toast
- showLoading(): Mostra loading spinner
- hideLoading(): Esconde loading spinner
- showModal(title, content, callback): Modal customizado

## FLUXO DE TELAS POR ROLE

### Super Admin
- Dashboard (stats globais, cards, lista de empresas) - COMPLETO
- Empresas (listar, editar, estender trial, ver detalhes)
- Usuários (listar, editar com telefone)
- Financeiro Global (todas comissoes)

### Dono
- Dashboard (stats da empresa, gráficos, métricas + AGENDA INTELIGENTE CORRIGIDA)
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
- GET /api/empresa/dados - Busca dados da empresa (com dias_bloqueio_geral, telefone_dono, endereco)
- PUT /api/empresa/bloqueio-geral - Atualiza o bloqueio geral
- PUT /api/empresa/telefone-dono - Atualiza o telefone do dono
- PUT /api/empresa/endereco - Atualiza o endereço da empresa
- GET /api/admin/empresas/estatisticas - Estatísticas completas (Super Admin)
- GET /api/admin/empresas/:id/usuarios - Usuários da empresa (Super Admin)
- GET /api/admin/empresas/:id/clientes - Clientes da empresa (Super Admin)
- GET /api/admin/empresas/:id/agendamentos - Agendamentos da empresa (Super Admin)
- GET /api/admin/empresas/:id/acessos - Acessos da empresa (Super Admin)
- PUT /api/admin/empresas/:id - Atualizar empresa (Super Admin)
- GET /api/admin/usuarios/:id - Buscar usuário (Super Admin)
- PUT /api/admin/usuarios/:id - Atualizar usuário (Super Admin)
- GET /api/admin/profissionais/:id - Buscar profissional (Super Admin)
- PUT /api/admin/profissionais/:id - Atualizar profissional (Super Admin)

=========================================
ULTIMA ATUALIZACAO: 01/07/2026
=========================================