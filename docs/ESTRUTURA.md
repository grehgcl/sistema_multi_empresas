﻿📄 3. IA_CONTEXT.md
IA_CONTEXT.md - SEE&AGENDE
ULTIMA ATUALIZACAO: 19/08/2026
🚀 COMO EXECUTAR O PROJETO
Modo Local (SQLite - Desenvolvimento)
bash
npm start
Banco SQLite local

WhatsApp em modo LOG

Modo com PostgreSQL (Teste com dados reais / Produção VPS)
bash
node -r dotenv/config server.js dotenv_config_path=.env.local
Banco PostgreSQL (Render ou VPS)

WhatsApp Evolution REAL

📝 RESUMO DO PROJETO
Sistema de gestão para barbearias, salões de beleza, estéticas e clínicas com três níveis de acesso:

Super Admin: Vê todas as empresas, estende trial, edita empresas, gerencia usuários, controla WhatsApp próprio, vê indicador de status.

Dono: Cadastro com 45 dias trial, gere sua empresa, serviços, profissionais, horários, WhatsApp próprio, FINANCEIRO COMPLETO, vê indicador de status.

Profissional: Visualiza seus agendamentos e comissões.

🔥 NOVIDADES (19/08/2026) - CORREÇÕES E MELHORIAS
CORREÇÃO DO CADASTRO 🚀
Problema: Empresa criada com ID NULL

Solução: Recriada tabela empresas com id INTEGER PRIMARY KEY AUTOINCREMENT

Melhoria: Banco criado com nome da empresa (ex: salao_das_rosas23_36.db)

Verificação: Sistema verifica se a empresa foi criada antes de prosseguir

CORREÇÃO DO INDICADOR WHATSAPP 📱
Problema: Indicador não mudava de cor (verde/vermelho)

Solução: Criada rota /api/whatsapp/status para monitorar status

Melhoria: Indicador funciona para DONO e SUPER ADMIN

Atualização: Menu gerado dinamicamente com status-dot

CORREÇÃO DAS ROTAS 🔧
Problema: Rotas 404 para /api/empresa/dados e /api/chatbot/horarios-disponiveis

Solução: Registro explícito das rotas no server.js

CORREÇÃO DA TABELA EMPRESAS 🗄️
Problema: Coluna id era TEXT sem AUTOINCREMENT

Solução: Recriada tabela com id INTEGER PRIMARY KEY AUTOINCREMENT

Migração: 15 empresas migradas com IDs corretos

CORREÇÃO DO FLUXO WHATSAPP 🚀
APENAS Super Admin pode criar/deletar instâncias WhatsApp

Dono só pode visualizar e conectar instâncias existentes

Botão WhatsApp no menu do Dono fica desabilitado se não houver instância

Dashboard recarrega automaticamente após toggle com cache limpo

Envio de WhatsApp na Confirmação: ✅ FUNCIONANDO

LIMPEZA DO PROJETO 🧹
Removida pasta lixo/ (cache do navegador)

Removidos arquivos de backup (*.backup, *.old)

Removidos scripts obsoletos (mais de 100 arquivos)

Removidas pastas de backup temporárias

CORREÇÃO DE VULNERABILIDADES 🛡️
tar atualizado para versão segura

uuid atualizado para versão segura

node-cron atualizado para versão segura

CORREÇÃO DO BOTÃO ON/OFF 🔧
Dashboard recarrega com dados novos após toggle

Cache limpo para garantir dados atualizados

Botão muda de cor corretamente (OFF → PEND → ON)

CORREÇÃO DO QR CODE 📱
QR Code aparece corretamente para o Dono quando instância existe

Dono não cria instância automaticamente ao acessar a página

Fluxo: SA cria → Dono conecta

MIGRAÇÃO DE AGENDAMENTOS 📊
125+ agendamentos migrados do banco principal para bancos individuais

Tabelas criadas para empresas faltantes (3, 4, 6, 7)

Colunas de pagamento adicionadas (forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento)

Horários de funcionamento criados para todas as empresas

CORREÇÕES VPS (08/08/2026)
Criada tabela horarios_funcionamento no PostgreSQL da VPS

Inseridos horários padrão para a empresa 14

Dashboard agora carrega os horários corretamente

Script migrar-usuarios-vps.js criado para garantir usuários no PostgreSQL

Usuários migrados do SQLite para o PostgreSQL

Adicionada coluna payment_mode na tabela configuracoes

CRIAÇÃO AUTOMÁTICA DE INSTÂNCIAS PELO SUPER ADMIN 🚀
Ao habilitar "WhatsApp Próprio" no painel do Super Admin, o sistema cria automaticamente a instância emp-X na Evolution API da VPS.

Lógica de "Recriação de Emergência": Se a instância sumir da VPS, o sistema a recria ao tentar conectar.

CLIENTES: ÍNDICE A-Z E BUSCA MOBILE (28/07/2026)
Botões A-Z para filtrar clientes por nome

Estado salvo no localStorage

Lupa removida no mobile

Scroll não recarrega a página

GRUPOS DE CLIENTES E PROMOÇÕES (27/07/2026)
Sistema de grupos: Premium, Frequentes, Promoções, Aniversariantes, Amigos, Indicados, Especiais

Filtro local sem recarregar a página

Debounce de 500ms

Formatação de números com 55

Fallback para diferentes formatos

EVOLUTION V2 (22/07/2026)
Endpoints corrigidos: /message/sendText/{instanceName}, /instance/connect/{instanceName}, /instance/connectionState/{instanceName}

Script de atualização blindado (atualizar.sh)

FINANCEIRO COMPLETO (13/07/2026)
Abas: Resumo, Receitas, Despesas, Comissões

Comparativo mês atual vs mês anterior com variação percentual

WHATSAPP MULTI-INSTÂNCIA (10/07/2026)
Provedor: Evolution API

Instância Padrão: seeagende

Instância Própria: Empresas Business/Enterprise

Confirmação, Lembrete 24h, Cancelamento e Conclusão automáticos

🗄️ ESTRUTURA DO BANCO (Principais Tabelas)
empresas: Inclui colunas whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado.

agendamentos: Inclui valor_total, servicos_extras, valor_extras, forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento.

despesas: Tabela completa para o módulo financeiro.

horarios_funcionamento: Tabela criada na VPS para horários de funcionamento.

configuracoes: Inclui payment_mode para controle de modo de pagamento.

🚀 DEPLOY PARA VPS (MÉTODO RECOMENDADO - GIT)
No VS Code (Local):
bash
git add .
git commit -m "feat: Descrição da atualização"
git push origin main
Na VPS (Terminal Local):
bash
ssh ubuntu@163.176.218.131 "cd ~/seeagende && cp .env /tmp/seeagende_env_backup && git pull origin main && cp /tmp/seeagende_env_backup .env && pm2 restart seeagende --update-env"
🔧 COMANDOS ÚTEIS
bash
# Ver instâncias na Evolution
curl -X GET 'http://localhost:8080/instance/fetchInstances' -H 'apikey: seeagende2024'

# Deletar instância
curl -X DELETE 'http://localhost:8080/instance/delete/emp-X' -H 'apikey: seeagende2024'

# Criar instância com nome correto
curl -X POST 'http://localhost:8080/instance/create' -H 'apikey: seeagende2024' -H 'Content-Type: application/json' -d '{"instanceName":"emp-X-nome-empresa","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'

# Criar horários na VPS
node scripts/criar-horarios-vps.js

# Migrar usuários na VPS
node scripts/migrar-usuarios-vps.js

# Ver logs na VPS
ssh ubuntu@163.176.218.131 "pm2 logs seeagende --lines 50"

# Limpar cache do navegador (Ctrl+F5)
✅ STATUS ATUAL (19/08/2026)
Funcionalidade	SQLite	PostgreSQL	Status
Login	✅	✅	OK
Dashboard	✅	✅	OK
Agenda Inteligente	✅	✅	OK
Financeiro com TABS	✅	✅	OK
Super Admin	✅	✅	OK
WhatsApp Multi-Instância (v2)	✅	✅	OK
Criação Auto. Instância (SA)	✅	✅	OK
Correção Query Booleana (VPS)	✅	✅	OK
Índice A-Z Clientes	✅	✅	OK
Busca Mobile Otimizada	✅	✅	OK
WhatsApp Próprio com Nome Correto	✅	✅	OK
Envio WhatsApp no Agendamento	✅	✅	OK
Horários na VPS	✅	✅	OK
Usuários na VPS	✅	✅	OK
Refatoração Backend	✅	✅	100% COMPLETA
Fluxo WhatsApp (SA cria, Dono usa)	✅	✅	OK
Botão ON/OFF Super Admin	✅	✅	OK
Limpeza do Projeto	✅	✅	OK
Migração de Agendamentos	✅	✅	OK
Pagamentos com Forma de Pagamento	✅	✅	OK
Envio WhatsApp na Confirmação	✅	✅	OK
Cadastro com Nome da Empresa	✅	✅	OK
Indicador WhatsApp (Dono)	✅	✅	OK
Indicador WhatsApp (Super Admin)	✅	✅	OK
Envio WhatsApp na Conclusão	⚠️	⚠️	EM ANDAMENTO
Envio WhatsApp no Cancelamento	⚠️	⚠️	PENDENTE
Lembrete 24h automático	⚠️	⚠️	PENDENTE
=========================================
ULTIMA ATUALIZACAO: 19/08/2026
=========================================