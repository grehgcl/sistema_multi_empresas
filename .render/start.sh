#!/bin/bash

# ============================================
# SCRIPT DE START PARA O RENDER
# ============================================

echo "🚀 Iniciando SEE&AGENDE no Render..."
echo "========================================="

# Mostrar informações do ambiente
echo "📋 NODE_ENV: $NODE_ENV"
echo "📋 RENDER: $RENDER"
echo "📋 PORT: $PORT"
echo "📋 DATABASE_URL: ${DATABASE_URL:0:50}..."

# Verificar se o banco está configurado
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL não configurado! Usando SQLite."
else
    echo "✅ PostgreSQL configurado!"
fi

# Rodar migrações
echo ""
echo "📦 Rodando migrações..."
if [ -f "scripts/migrate.js" ]; then
    node scripts/migrate.js
else
    echo "⚠️  scripts/migrate.js não encontrado. Pulando..."
fi

# Verificar se precisa rodar seed
echo ""
echo "🌱 Verificando dados iniciais..."
if [ -f "scripts/seed.js" ]; then
    node scripts/seed.js
else
    echo "⚠️  scripts/seed.js não encontrado. Pulando..."
fi

# Iniciar o servidor
echo ""
echo "▶️  Iniciando servidor..."
node server.js
