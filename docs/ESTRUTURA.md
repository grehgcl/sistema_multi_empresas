﻿=========================================
ESTRUTURA.md - SEE&AGENDE
ULTIMA ATUALIZACAO: 31/07/2026
=========================================

🚀 COMO EXECUTAR O PROJETO
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
│   ├── chatbot.html           # Página do Chatbot Inteligente
│   ├── css/
│   │   ├── style.css         # Estilos premium com tema escuro
│   │   └── chatbot.css       # Estilos específicos do chatbot
│    └── js/
│       ├── ui.js             # UI Global (toasts, loading, modal)
│       └── pages/
│           ├── dashboard.js              # Dashboard com Agenda Inteligente
│            ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + GRUPOS + PROMOÇÕES + ÍNDICE A-Z ⭐
│           ├── agendamentos.js           # CRUD Agendamentos
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos
│            ├── financeiro.js             # FINANCEIRO COMPLETO COM TABS ⭐
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          #  Configuracoes + Tema + Chatbot
│           ├── planos.js                 # Página de Planos e Upgrade
│           └── whatsapp-config.js        # Configuração WhatsApp (Dono)
├──  docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/
│   ├── config/
│   │   ├── database.js       # Conexão com banco + criação das tabelas
│   │   └── whatsapp.js      # Configuração do WhatsApp
│   ├── middlewares/
│   │   └── auth.js          # Middlewares de autenticação
│   ├── services/
│   │   ├── whatsapp.js      # Serviço de notificações WhatsApp (CORRIGIDO)
│   │   ├── evolution-instances.js  # Gestão de instâncias WhatsApp (CORRIGIDO v2) 
│   │   └── mercadopago.js   # Integração com MercadoPago
│   ├── jobs/
│   │   ├── lembretes.js     # Job automático de lembretes (09:00)
│   │   └── reset-contador.js # Job de reset de contadores
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares
├── scripts/
│   ├── migrate.js            # Migração do banco
│   ├── seed.js              # População com dados iniciais
│   ├── migrate-vps.js       # Script principal de migração segura (VPS)
│   ├── migrate-whatsapp.js  # Migração WhatsApp (SQLite)
│   └── migrate-whatsapp-pg.js # Migração WhatsApp (PostgreSQL)
├── .env                     # SQLite (desenvolvimento)
├── .env.local                # PostgreSQL (teste com dados reais)
├── atualizar.sh             # Script de atualização blindado da VPS ⭐
├── server.js                # Backend completo + rotas
└── package.json             # Dependências e scripts

=========================================
🔥 NOVIDADES (31/07/2026) - CORREÇÃO WHATSAPP PRÓPRIO E INSTÂNCIAS
=========================================
CORREÇÃO DO NOME DAS INSTÂNCIAS 🚀
- Instâncias agora são criadas com formato: `emp-{ID}-{NOME-DA-EMPRESA}`
- Exemplo: `emp-14-salao-da-sandra-` em vez de `emp-14`
- Garante que cada empresa tenha uma instância única e identificável

CORREÇÃO DA ROTA DO SUPER ADMIN 🛠️
- Rota `app.put('/api/admin/empresas/:id/whatsapp-proprio')` corrigida
- Agora busca o nome da empresa e cria instância com ID + NOME

CORREÇÃO DO ENVIO DE WHATSAPP NO AGENDAMENTO 📱
- Substituído `pool.query` por `db.get` para compatibilidade
- Agora funciona corretamente no SQLite e PostgreSQL

=========================================
🔥 NOVIDADES (30/07/2026) - AUTOMAÇÃO WHATSAPP SUPER ADMIN
=========================================
CRIAÇÃO AUTOMÁTICA DE INSTÂNCIAS 🚀
- Ao habilitar "WhatsApp Próprio" no Super Admin, a instância é criada na Evolution API.
- Lógica de recriação de emergência se a instância sumir.
- Correção do erro `db.runAsync is not a function`.

CORREÇÃO DE QUERY BOOLEANA NO POSTGRESQL 🛠️
- Corrigido erro na busca de serviços do Chatbot na VPS.

=========================================
🔥 NOVIDADES (28/07/2026) - CLIENTES: ÍNDICE A-Z E BUSCA MOBILE
=========================================
ÍNDICE ALFABÉTICO (A-Z) PARA CLIENTES 📋
Botões A-Z para filtrar clientes por nome
Estado salvo no localStorage (mantém ao recarregar/scrollar)
Posição sticky no topo da lista
Compatível com desktop e mobile

REMOÇÃO DA LUPA NO MOBILE 📱
Lupa removida do input de busca
Placeholder: "🔍 Buscar por nome..."
Botão "Buscar" removido no mobile

CORREÇÃO DO SCROLL 🔄
Scroll não recarrega mais a página
Filtro de letra permanece ativo ao rolar
Evento resize ignorado com filtro ativo

=========================================
🔥 NOVIDADES (27/07/2026) - CORREÇÕES CLIENTES E PROMOÇÕES
=========================================
GRUPOS DE CLIENTES 👥
Sistema de grupos: Premium, Frequentes, Promoções, Aniversariantes, Amigos, Indicados, Especiais
Filtro por grupos na página de clientes (atualiza sem recarregar)
Modal de gerenciamento de grupos com criação dinâmica
Persistência de grupos personalizados

BUSCA MOBILE OTIMIZADA 📱
Busca local sem recarregar a página
Debounce de 500ms para melhor performance
Evento resize não interfere na digitação
Foco restaurado após atualização

MODAL DE PROMOÇÃO 📢
Todos os grupos disponíveis no filtro
Filtro por grupo funcionando
Busca por nome/telefone dentro do modal
Contagem de clientes por grupo

WHATSAPP CORRIGIDO 📱
Formatação de números com 55
Fallback para diferentes formatos
Instância própria funcionando

=========================================
🔥 NOVIDADES (22/07/2026) - CORREÇÕES EVOLUTION V2 E SCRIPT BLINDADO
=========================================
ENDPOINTS EVOLUTION API v2 CORRIGIDOS 📱
Envio de mensagem: `/message/sendText/{instanceName}`
Obter QR Code: `/instance/connect/{instanceName}`
Verificar status: `/instance/connectionState/{instanceName}`

NOVAS COLUNAS NO BANCO (Tabela: agendamentos) 💾
valor_total (NUMERIC DEFAULT 0)
servicos_extras (JSONB DEFAULT '[]'::jsonb)
valor_extras (NUMERIC DEFAULT 0)

SCRIPT DE ATUALIZAÇÃO BLINDADO (`atualizar.sh`) 🛡️
Salva .env em /tmp antes do git.
Usa `git reset --hard origin/main` e `git clean -fd`
Restaura o .env do /tmp.
Roda `npm install --omit=dev` e migração

LÓGICA DE FALLBACK CONFIRMADA ✅
Se a instância própria NÃO estiver conectada, usa a instância padrão

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
WhatsApp Próprio com Nome Correto  ✅       ✅           NOVO! ⭐
Envio WhatsApp no Agendamento      ✅       ✅           NOVO! ⭐

=========================================
ULTIMA ATUALIZACAO: 31/07/2026