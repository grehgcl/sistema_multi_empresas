#!/bin/bash

echo "========================================="
echo " ATUALIZANDO ARQUIVOS DA VPS"
echo "========================================="
echo ""

# 1. Fazer backup dos arquivos atuais
echo ">> Fazendo backup dos arquivos locais..."
mkdir -p backup_local
cp server/routes/whatsapp.routes.js backup_local/ 2>/dev/null || echo "  (whatsapp.routes.js nao encontrado)"
cp server/services/evolution-instances.js backup_local/ 2>/dev/null || echo "  (evolution-instances.js nao encontrado)"
cp server/services/whatsapp.js backup_local/ 2>/dev/null || echo "  (whatsapp.js nao encontrado)"
cp server/routes/admin.routes.js backup_local/ 2>/dev/null || echo "  (admin.routes.js nao encontrado)"
cp public/js/pages/whatsapp-config.js backup_local/ 2>/dev/null || echo "  (whatsapp-config.js nao encontrado)"
cp public/js/pages/empresas.js backup_local/ 2>/dev/null || echo "  (empresas.js nao encontrado)"
cp public/js/pages/dashboard.js backup_local/ 2>/dev/null || echo "  (dashboard.js nao encontrado)"
cp public/index.html backup_local/ 2>/dev/null || echo "  (index.html nao encontrado)"
echo ""

# 2. Copiar arquivos da VPS
echo ">> Copiando arquivos da VPS..."
cp vps_backup/whatsapp.routes.js server/routes/whatsapp.routes.js
cp vps_backup/evolution-instances.js server/services/evolution-instances.js
cp vps_backup/whatsapp.js server/services/whatsapp.js
cp vps_backup/admin.routes.js server/routes/admin.routes.js
cp vps_backup/whatsapp-config.js public/js/pages/whatsapp-config.js
cp vps_backup/empresas.js public/js/pages/empresas.js
cp vps_backup/dashboard.js public/js/pages/dashboard.js
cp vps_backup/index.html public/index.html
echo ""

# 3. Verificar arquivos atualizados
echo ">> Verificando arquivos atualizados..."
ls -la server/routes/whatsapp.routes.js
ls -la vps_backup/whatsapp.routes.js
echo ""

echo "========================================="
echo " ARQUIVOS ATUALIZADOS COM SUCESSO!"
echo "========================================="
echo ""
echo "PROXIMOS PASSOS:"
echo "1 - Reinicie o servidor: npm start"
echo "2 - Limpe o cache do navegador (Ctrl+F5)"
echo "3 - Teste o WhatsApp novamente"
echo ""