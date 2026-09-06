# 📊 Contexto Completo do SEE&AGENDE

## 📋 Visão Geral

- **Sistema:** SEE&AGENDE
- **Versão:** 2.0.0
- **Data:** 01/09/2026, 02:01:34
- **Arquivos:** 106

## 🛤️ Endpoints da API (151)

- `GET` /admin/stats
- `GET` /admin/empresas
- `GET` /admin/empresas/:id
- `PUT` /admin/empresas/:id
- `DELETE` /admin/empresas/:id
- `GET` /admin/usuarios
- `GET` /admin/empresa/:id
- `GET` /admin/usuarios/:id
- `PUT` /admin/usuarios/:id
- `GET` /admin/faturamento-mensal
- `GET` /admin/crescimento-empresas
- `GET` /admin/empresas/:id/usuarios
- `GET` /admin/empresas/:id/acessos
- `GET` /admin/empresas/:id/clientes
- `GET` /admin/empresas/:id/agendamentos
- `POST` /admin/empresas/:id/extender-trial
- `GET` /admin/empresas/estatisticas
- `GET` /admin/empresas/:id
- `PUT` /admin/profissionais/:id
- `GET` /admin/profissionais/:id

*... e mais 131 endpoints*

## ⚙️ Serviços (5)

- **email**: 4 funções
- **evolution-instances**: 1 funções
- **evolution-websocket**: 1 funções
- **mercadopago**: 1 funções
- **whatsapp**: 10 funções

## 📋 Regras de Negócio (68)

- **business_rule**: `if (!data.server.security.hasRateLimit) {...` (analisar-projeto-completo.js:447)
- **limit**: `if (!data.server.security.hasRateLimit) important.push(`Adicionar \`express-rate...` (analisar-projeto-completo.js:679)
- **business_rule**: `const podeAgendar = await verificarLimiteAgendamentos(clienteAtual.id);...` (public\js\chatbot.js:545)
- **business_rule**: `async function verificarLimiteAgendamentos(clienteId) {...` (public\js\chatbot.js:628)
- **business_rule**: `if (dataAg >= dataLimite) {...` (public\js\chatbot.js:671)
- **limit**: `console.error('Erro ao verificar limite:', error);...` (public\js\chatbot.js:679)
- **check**: `if (check) check.remove();...` (public\js\pages\agendamentos.js:3169)
- **check**: `if (!selecionado.querySelector('.fa-check-circle')) {...` (public\js\pages\agendamentos.js:3176)
- **check**: `if (!checkbox) continue;...` (public\js\pages\clientes.js:2477)
- **check**: `if (checkbox) {...` (public\js\pages\clientes.js:2525)

## 📦 Dependências

- Produção: 13
- Desenvolvimento: 4


## 💡 Sugestões de Melhoria

### DOCUMENTATION
- Adicionar comentários JSDoc nas funções principais
- Impacto: Facilita a compreensão do código por outras IAs e desenvolvedores

### TESTING
- Implementar testes unitários para as regras de negócio
- Impacto: Garante a confiabilidade do sistema

### SECURITY
- Adicionar rate limiting nas rotas de pagamento
- Impacto: Protege contra ataques de força bruta


## 🔄 Últimas Alterações

### Commits Recentes (2)

- 03ff0abb update: enviando todas as atualizações PWA, CSS e JS
- 23aa0522 fix: alterando HOST para 0.0.0.0 para aceitar conexões externas

## 🚀 Comandos de Deploy

### VPS (179.199.134.127)

**Acessar:**
```bash
ssh root@179.199.134.127
cd /var/www/barbearia_nova
```

**Reiniciar:**
```bash
pm2 restart seeagende
pm2 logs seeagende --lines 20
```

**Enviar arquivos:**
```bash
scp public/js/pages/planos.js root@179.199.134.127:/var/www/barbearia_nova/public/js/pages/
scp public/js/pages/empresas.js root@179.199.134.127:/var/www/barbearia_nova/public/js/pages/
scp server/routes/*.js root@179.199.134.127:/var/www/barbearia_nova/server/routes/
scp server.js root@179.199.134.127:/var/www/barbearia_nova/
scp .env root@179.199.134.127:/var/www/barbearia_nova/
```


## 📁 Estrutura de Pastas

- **public**: Arquivos públicos (frontend)
  - css/pages: Estilos das páginas
  - js/pages: JavaScript das páginas
  - admin: Painel administrativo
  - icons: Ícones do sistema
- **server**: Backend do sistema
  - config: Configurações (banco de dados, etc)
  - routes: Rotas da API (151 endpoints)
  - services: Serviços (email, whatsapp, mercadopago)
  - middlewares: Middlewares (auth, validação)
  - jobs: Jobs agendados (cron)
  - utils: Funções utilitárias
- **database**: Arquivos de banco de dados SQLite
- **scripts**: Scripts de automação e análise

## 🔄 Fluxos de Usuário

### AGENDAMENTO
- Fluxo de agendamento
  - 1. Cliente acessa o chatbot
  - 2. Seleciona serviço
  - 3. Escolhe profissional (opcional)
  - 4. Seleciona data e horário
  - 5. Confirma agendamento
  - 6. Recebe confirmação via WhatsApp

### PAGAMENTO
- Fluxo de pagamento de plano
  - 1. Usuário acessa página de planos
  - 2. Escolhe plano (Starter/Pro)
  - 3. Clica em "Pagar agora"
  - 4. Redirecionado para MercadoPago
  - 5. Realiza pagamento (PIX/Cartão/Boleto)
  - 6. Webhook confirma pagamento
  - 7. Plano é ativado automaticamente

### ADMIN
- Fluxo do Super Admin
  - 1. Acessa o dashboard
  - 2. Vê lista de empresas
  - 3. Pode editar/ativar/deletar empresas
  - 4. Pode ativar WhatsApp em qualquer plano
  - 5. Gerencia usuários


## 🐛 Erros Conhecidos

- ✅ **Tabela transacoes_pagamento não existe** (resolvido)
  - Solução: Criar tabela manualmente ou adicionar no server.js
  - Arquivo: server.js

- ✅ **Webhook MercadoPago 404** (resolvido)
  - Solução: Adicionar rota /api/pagamento no server.js
  - Arquivo: server.js

- ✅ **Modo de pagamento simulation mesmo com .env real** (resolvido)
  - Solução: Sincronizar banco de dados com .env
  - Arquivo: server.js + planos.routes.js


## 📋 Próximos Passos

- 1. ✅ Pagamento com PIX - FUNCIONANDO
- 2. ✅ Pagamento com Cartão - FUNCIONANDO
- 3. ✅ Ativação automática via webhook - FUNCIONANDO
- 4. 🔄 Melhorar feedback visual (toast) - EM ANDAMENTO
- 5. 🔄 Criar página de sucesso/erro - EM ANDAMENTO
- 6. ⏳ Implementar testes unitários - PENDENTE
- 7. ⏳ Adicionar rate limiting - PENDENTE

## ⚙️ Variáveis de Ambiente

**Obrigatórias:**

- `NODE_ENV`: Ambiente (development/production) (ex: production)
- `PORT`: Porta do servidor (ex: 3000)
- `BASE_URL`: URL pública do sistema (ex: https://seeagende.tech)
- `JWT_SECRET`: Chave secreta para JWT (ex: ****)
- `PAYMENT_MODE`: Modo de pagamento (real/simulation) (ex: real)
- `MERCADOPAGO_ACCESS_TOKEN`: Token do MercadoPago (ex: APP_USR-****)

**Opcionais:**

- `WHATSAPP_ENABLED`: Habilitar WhatsApp (ex: true)
- `EVOLUTION_API_URL`: URL da Evolution API (ex: http://localhost:8080)
