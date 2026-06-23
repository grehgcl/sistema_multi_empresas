﻿
---

## 📁 **2. ESTRUTURA.md**

```markdown
# ESTRUTURA DO PROJETO - Atualizada em 18/06/2026

├── database/
│   └── barbearia.db          # SQLite (desenvolvimento local)
├── public/
│   ├── index.html            # Landing Page + Frontend principal (tela dividida)
│   ├── chatbot.html          # Página do Chatbot Inteligente
│   ├── css/
│   │   ├── style.css         # Estilos premium principais (organizado)
│   │   └── chatbot.css       # Estilos específicos do chatbot
│   └── js/
│       ├── ui.js             # UI Global (toasts, loading, modal)
│       └── pages/
│           ├── dashboard.js              # Dashboard Dono (cards melhorados)
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + WhatsApp + Cards
│           ├── agendamentos.js           # CRUD Agendamentos + Cards Mobile
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos + Cards Mobile
│           ├── financeiro.js             # Financeiro + Cards Mobile
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          # Configuracoes + Chatbot
│           └── planos.js                 # Página de Planos e Upgrade
├── docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/                  # ESTRUTURA MODULAR DO BACKEND
│   ├── config/
│   │   └── database.js      # Conexão com banco + criação das tabelas
│   ├── middlewares/
│   │   └── auth.js          # Middlewares de autenticação
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, PLANOS_NOMES, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares
├── scripts/                 # Scripts utilitários
│   ├── migrate.js           # Migração do banco de dados
│   └── seed.js              # População com dados iniciais
├── .render/
│   └── start.sh             # Script de inicialização no Render
├── keep_alive.js            # Mantém o servidor ativo no Render
├── cron.js                  # Job alternativo para manter servidor ativo
├── render.yaml              # Configuração de deploy no Render
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── README.md                # Documentação do projeto
└── server.js                # Backend completo + rotas (~700 linhas)

## VARIAVEIS GLOBAIS (localStorage)
- token: JWT do usuario logado
- usuario: { id, nome, email, role, empresa_id, comissao_percent? }

## VARIAVEIS DE AMBIENTE (.env)
- NODE_ENV: production / development
- RENDER: true / false (identifica ambiente Render)
- DATABASE_URL: URL do PostgreSQL (apenas produção)
- PORT: 3000 (padrão)
- JWT_SECRET: Chave secreta para JWT
- RENDER_EXTERNAL_URL: URL pública do serviço (para keep alive)

## FUNCOES GLOBAIS (no index.html)
- ativarBotao(id): Marca botão do menu como ativo
- fecharModal(id): Fecha modal
- logout(): Sai do sistema
- carregarMenu(): Monta menu baseado na role
- mostrarLanding(): Mostra landing page de vendas
- mostrarLoginApp(): Mostra tela de login
- mostrarCadastroApp(): Mostra tela de cadastro

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
- Dashboard (stats da empresa, gráficos, métricas)
- Agendamentos (CRUD com filtros, edicao, horarios 30/30min)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD + bloqueio chatbot + WhatsApp)
- Configuracoes (Profissionais + Horarios + Chatbot)
- Planos (Visualizar planos e fazer upgrade)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir)
- Minhas Comissoes (suas comissoes)

## SISTEMA DE COMISSOES
- Dono define % ao criar profissional (padrão 30%)
- Ao concluir agendamento com profissional, comissao = valor * (comissao_percent / 100)
- Comissao so e gerada se profissional_id existir
- Comissao fica salva no campo 'comissao' da tabela agendamentos

## SISTEMA DE SERVICOS
- Dono cria servicos com nome, descricao, valor, duracao
- Servicos aparecem em select nos agendamentos
- Ao selecionar um servico, valor e preenchido automaticamente
- Servicos podem ser ativados/desativados

## SISTEMA DE HORARIOS DE FUNCIONAMENTO
- Dono configura dias e horarios na tela de Configuracoes
- Toggle switch liga/desliga por dia da semana
- Configuração de horário de abertura e fechamento
- Configuração de horário de almoço (início e fim)
- Intervalo FIXO de 30 minutos (código)
- Salvamento automático ao alterar valores
- Agendamentos validam automaticamente os horários

## SISTEMA DE PLANOS
- Starter: R$ 24,90/mês - 1 profissional
- Pro: R$ 49,90/mês - 5 profissionais
- Business: R$ 99,90/mês - 12 profissionais
- Enterprise: R$ 199,90/mês - Profissionais ilimitados
- 45 dias de teste grátis para novos cadastros
- Middleware verifica limite antes de criar profissional
- Tabela planos_historico registra todas as mudanças
- Rota de cancelamento de assinatura (/api/cancel-subscription)
- Ao cancelar, volta para Trial com 7 dias

## SISTEMA DE PAGAMENTOS
- Integração com Mercado Pago (PIX, Cartão, Boleto)
- Modo de simulação para testes (modoSimulacao = true)
- Tabela transacoes_pagamento para registrar pagamentos
- Webhook para confirmação automática
- QR Code para pagamento PIX
- Suporte a parcelamento no cartão

## CHATBOT INTELIGENTE
- Página pública: /chatbot.html?empresa=ID
- Conversa natural estilo assistente virtual
- Verifica cliente por telefone (busca flexível)
- Cadastro automático de novos clientes
- Calendário visual para seleção de datas
- Horários de 30 em 30 minutos
- Limite de 1 agendamento a cada 20 dias
- Dono pode bloquear clientes na tela de Clientes
- Dono aparece como opção de profissional

## FINANCEIRO DO DONO
- Faturamento Bruto: soma de todos os servicos concluidos
- Comissoes a Pagar: soma das comissoes (apenas com profissional)
- Faturamento Liquido: Bruto - Comissoes
- Cards por profissional: cada profissional com seu total de comissao

## DASHBOARD DO DONO
- Cards com faturamento do mês, total atendimentos, clientes, pendentes
- Cards com ticket médio, serviços concluídos, comissões a pagar
- Gráfico de agendamentos por dia da semana
- Ranking de serviços mais populares (Top 5)
- Lista de próximos agendamentos
- Grid de últimos clientes

## LANDING PAGE (TELA DIVIDIDA)
- Split screen: marketing (esquerda) + login/cadastro (direita)
- Versículo bíblico (Provérbios 16:3) no lado marketing
- Design responsivo que empilha no mobile
- Sem scroll desnecessário, tudo em uma tela

## CONFIGURACOES (TABS)
1. 👥 Profissionais - CRUD completo + limite por plano
2. ⏰ Horários - Configuração de expediente
3. 🤖 Chatbot - Link e QR Code para compartilhar

## CLIENTES (MELHORADO)
- Listagem completa com ações
- Botão para bloquear/desbloquear chatbot
- Badges de status (🔓 Liberado / 🔒 Bloqueado)
- Edição completa de clientes
- Botão WhatsApp para chamar cliente diretamente

## REFATORACAO DO BACKEND (16/06/2026)
=========================================

### server/config/database.js
- Conexão com banco SQLite (desenvolvimento) e PostgreSQL (produção)
- Função initDatabase() para criar todas as tabelas
- Função inserirHorariosPadrao() para horários iniciais
- Wrapper para compatibilidade entre SQLite e PostgreSQL

### server/middlewares/auth.js
- auth() - Middleware de autenticação JWT
- verificarSuperAdmin() - Apenas Super Admin
- verificarDono() - Apenas Dono
- verificarLimiteProfissionais() - Verifica limite do plano
- verificarAcessoAgendamentos() - Verifica trial/assinatura

### server/utils/constants.js
- PLANOS - Configurações de todos os planos
- PLANOS_NOMES - Nomes dos planos
- JWT_SECRET - Chave secreta do JWT

### server/utils/helpers.js
- horaParaMinutos() - Converte hora para minutos
- minutosParaHora() - Converte minutos para hora
- getDiaSemanaFromDate() - Pega dia da semana da data
- gerarSenhaTemporaria() - Gera senha aleatória

### server.js (refatorado)
- Apenas as rotas da API (~700 linhas)
- Importa as partes fixas dos arquivos acima
- ~200 linhas a menos que o original

## DEPLOY NO RENDER (17/06/2026)
=========================================

### Banco de Dados Híbrido
- Local: SQLite (desenvolvimento)
- Produção: PostgreSQL (Render)

### Scripts de Deploy
- keep_alive.js: Evita que o servidor durma no Render
- cron.js: Job alternativo para manter servidor ativo
- scripts/migrate.js: Migração do banco de dados
- scripts/seed.js: População com dados iniciais
- .render/start.sh: Script de inicialização no Render

### Variáveis de Ambiente no Render
- NODE_ENV: production
- RENDER: true
- DATABASE_URL: URL do PostgreSQL (fornecida pelo Render)
- PORT: 3000 (padrão)
- JWT_SECRET: Gerada automaticamente
- RENDER_EXTERNAL_URL: URL pública do serviço

### Correções para PostgreSQL
- Todos os placeholders SQL adaptados ($1, $2, ...)
- COALESCE adaptado para funcionar em ambos os bancos
- ON CONFLICT substituído por verificações manuais
- INSERT OR IGNORE substituído por INSERT com verificação

## MELHORIAS UI/UX (18/06/2026)
=========================================

### Cards Mobile para todas as páginas
- Agendamentos: cards com avatar do cliente e ações em botões
- Serviços: cards com status e toggle ativar/desativar
- Financeiro: cards de profissionais com avatar e comissão
- Clientes: cards com avatar, WhatsApp e ações

### Botão WhatsApp nos Clientes
- Link direto para WhatsApp do cliente
- Ícone do WhatsApp com hover effect
- Desabilitado se cliente não tem telefone

### Menu Mobile Corrigido
- Sidebar fecha ao clicar nas abas
- Overlay com backdrop blur
- Botão hambúrguer no canto inferior direito
- Transição suave ao abrir/fechar

### Fontes Maiores no Mobile
- Todos os textos aumentados em ~15-20%
- Botões e inputs maiores para melhor toque
- Cards com fontes legíveis

### CSS Organizado
- Código dividido em 36 seções numeradas
- Facilita manutenção e localização de estilos
- Variáveis CSS centralizadas

### Versículo Bíblico
- Provérbios 16:3 adicionado na landing page
- Ícone de Bíblia (fa-bible) no versículo
- Versículo também no rodapé

### Keep Alive Melhorado
- Ping externo e interno (fallback)
- Intervalo reduzido para 4 minutos
- Cron job separado para redundância
- Logs com timestamp para monitoramento

=========================================
## ULTIMA ATUALIZACAO: 18/06/2026
=========================================


---

## 📄 ESTRUTURA.md (ATUALIZADO)

```markdown
# ESTRUTURA DO PROJETO - Atualizada em 20/06/2026

├── database/
│   └── barbearia.db          # SQLite (desenvolvimento local)
├── public/
│   ├── index.html            # Landing Page + Frontend principal
│   ├── chatbot.html          # Página do Chatbot Inteligente
│   ├── css/
│   │   ├── style.css         # Estilos premium principais
│   │   └── chatbot.css       # Estilos específicos do chatbot
│   └── js/
│       ├── ui.js             # UI Global (toasts, loading, modal)
│       └── pages/
│           ├── dashboard.js
│           ├── dashboard-profissional.js
│           ├── clientes.js
│           ├── agendamentos.js
│           ├── agendamentos-profissional.js
│           ├── servicos.js
│           ├── financeiro.js
│           ├── empresas.js
│           ├── configuracoes.js
│           └── planos.js
├── docs/
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/
│   ├── config/
│   │   └── database.js
│   ├── middlewares/
│   │   └── auth.js
│   ├── services/             # NOVO!
│   │   └── whatsapp.js       # Serviço de notificações WhatsApp
│   ├── jobs/                 # NOVO!
│   │   └── lembretes.js      # Job automático de lembretes
│   └── utils/
│       ├── constants.js
│       └── helpers.js
├── scripts/
│   ├── migrate.js
│   ├── seed.js
│   └── migrate-whatsapp.js   # NOVO! Migração WhatsApp
├── .render/
│   └── start.sh
├── keep_alive.js
├── cron.js
├── render.yaml
├── .env.example
├── package.json
├── README.md
└── server.js                 # Backend com rotas WhatsApp integradas

## NOVAS VARIAVEIS DE AMBIENTE (.env)
```env
# WhatsApp Config
WHATSAPP_ENABLED=true         # Ativa/Desativa WhatsApp
WHATSAPP_PROVIDER=log         # log | wati | evolution

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_aqui
EVOLUTION_INSTANCE=seeagende

NOVAS FUNCOES (whatsapp.js)
send(phone, message, options): Envia mensagem

enviarConfirmacao(agendamento): Confirmação de agendamento

enviarLembrete(agendamento): Lembrete 24h antes

enviarNovoAgendamentoProfissional(agendamento): Notifica profissional

enviarCancelamento(agendamento): Notifica cancelamento

NOVAS COLUNAS NO BANCO
agendamentos.lembrete_enviado (INTEGER DEFAULT 0)

profissionais.telefone (TEXT)

=========================================
ULTIMA ATUALIZACAO: 20/06/2026
=========================================


---

### **2. docs/ESTRUTURA.md**

```markdown
# ESTRUTURA DO PROJETO - Atualizada em 21/06/2026

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
│           ├── dashboard.js              # Dashboard com ações rápidas
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + WhatsApp
│           ├── agendamentos.js           # CRUD Agendamentos
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│           ├── financeiro.js             # Financeiro
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          # Configuracoes + Tema
│           └── planos.js                 # Página de Planos e Upgrade
├── docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/
│   ├── config/
│   │   └── database.js      # Conexão com banco
│   ├── middlewares/
│   │   └── auth.js          # Middlewares de autenticação
│   ├── services/
│   │   └── whatsapp.js      # Serviço de notificações WhatsApp
│   ├── jobs/
│   │   └── lembretes.js     # Job automático de lembretes
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares
├── scripts/
│   ├── migrate.js           # Migração do banco
│   └── seed.js              # População com dados iniciais
├── .render/
│   └── start.sh             # Script de inicialização no Render
├── keep_alive.js            # Mantém o servidor ativo
├── cron.js                  # Job alternativo para manter servidor ativo
├── render.yaml              # Configuração de deploy no Render
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── README.md                # Documentação do projeto
└── server.js                # Backend completo + rotas

## TEMA ESCURO (NOVO!)
- O sistema inicia com tema escuro por padrão
- Toggle disponível nas Configurações > Tema
- Estilo Instagram com transições suaves
- Salvo automaticamente no localStorage

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
- Dashboard (stats da empresa, gráficos, métricas)
- Agendamentos (CRUD com filtros, edicao, horarios 30/30min)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD + bloqueio chatbot + WhatsApp)
- Configuracoes (Profissionais + Horarios + Chatbot + Tema)
- Planos (Visualizar planos e fazer upgrade)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir)
- Minhas Comissoes (suas comissoes)

=========================================
ULTIMA ATUALIZACAO: 21/06/2026
=========================================

# ESTRUTURA DO PROJETO - Atualizada em 22/06/2026

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
│           ├── dashboard.js              # Dashboard com ações rápidas
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + WhatsApp
│           ├── agendamentos.js           # CRUD Agendamentos
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│           ├── financeiro.js             # Financeiro
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          # Configuracoes + Tema + Chatbot
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
│   │   └── reset-contador.js # Job de reset de contadores (NOVO!)
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares
├── scripts/
│   ├── migrate.js           # Migração do banco
│   ├── seed.js              # População com dados iniciais
│   └── migrate-limite-agendamentos.js # Migração para limite (NOVO!)
├── .render/
│   └── start.sh             # Script de inicialização no Render
├── keep_alive.js            # Mantém o servidor ativo
├── cron.js                  # Job alternativo para manter servidor ativo
├── render.yaml              # Configuração de deploy no Render
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── README.md                # Documentação do projeto
├── test-limite.js           # Script para testar limite (NOVO!)
└── server.js                # Backend completo + rotas

## TEMA ESCURO (NOVO!)
- O sistema inicia com tema escuro por padrão
- Toggle disponível nas Configurações > Tema
- Estilo Instagram com transições suaves
- Salvo automaticamente no localStorage

## LIMITE DE AGENDAMENTOS (NOVO!)
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
- Dashboard (stats da empresa, gráficos, métricas)
- Agendamentos (CRUD com filtros, edicao, horarios 30/30min)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD + bloqueio chatbot + WhatsApp)
- Configuracoes (Profissionais + Horarios + Chatbot + Tema)
- Planos (Visualizar planos e fazer upgrade)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir)
- Minhas Comissoes (suas comissoes)

=========================================
ULTIMA ATUALIZACAO: 22/06/2026
=========================================

# ESTRUTURA DO PROJETO - Atualizada em 23/06/2026

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
│           ├── configuracoes.js          # Configuracoes + Tema + Chatbot
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
│   └── migrate-dias-bloqueio.js # Migração para dias_bloqueio (NOVO!)
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

## AGENDA INTELIGENTE (NOVO!)
- Card da Agenda dentro do Dashboard (abaixo de Ações Rápidas)
- Visualização semanal com grade de horários (08:00 às 18:00)
- Cada profissional tem uma cor única (Dono = dourado 👑)
- Clique na bolinha colorida abre modal com data/hora pré-setados
- Cores: 🟢 Disponível, 🔴 Ocupado, 🍽️ Almoço, 🔒 Fechado
- Legenda de cores no topo do card

## DIAS_BLOQUEIO POR CLIENTE (NOVO!)
- Campo `dias_bloqueio` na tabela `clientes` (padrão = 1)
- Dono configura no modal de edição do cliente
- 1 dia = não pode agendar 2 vezes no mesmo dia
- 7 dias = só pode agendar 1 vez por semana
- 0 dias = sem restrição
- Validação no backend (POST /api/agendamentos)
- Validação no chatbot (POST /api/chatbot/agendar)
- Mensagem clara com data exata que pode agendar

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
- Configuracoes (Profissionais + Horarios + Chatbot + Tema)
- Planos (Visualizar planos e fazer upgrade)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir)
- Minhas Comissoes (suas comissoes)

=========================================
ULTIMA ATUALIZACAO: 23/06/2026
=========================================