# ============================================
# SCRIPT: copiar-da-vps.ps1
# Executar: ./copiar-da-vps.ps1
# ============================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " COPIANDO ARQUIVOS DA VPS PARA LOCAL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Criar backup
Write-Host "📁 Criando backup dos arquivos atuais..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path backup_local_antes_vps | Out-Null

$arquivosBackup = @(
    "server/routes/whatsapp.routes.js",
    "server/routes/admin.routes.js",
    "server/services/evolution-instances.js",
    "server/services/whatsapp.js",
    "public/js/pages/whatsapp-config.js",
    "public/js/pages/empresas.js",
    "public/js/pages/dashboard.js",
    "public/index.html"
)

foreach ($arquivo in $arquivosBackup) {
    if (Test-Path $arquivo) {
        Copy-Item -Path $arquivo -Destination "backup_local_antes_vps/" -ErrorAction SilentlyContinue
        Write-Host "  ✅ Backup: $arquivo"
    }
}
Write-Host "✅ Backup criado em backup_local_antes_vps/" -ForegroundColor Green
Write-Host ""

# 2. Copiar arquivos da VPS
Write-Host "📥 Copiando arquivos da VPS..." -ForegroundColor Yellow

$arquivosVPS = @(
    # Backend - Rotas
    @{Origem="~/seeagende/server/routes/whatsapp.routes.js"; Destino="server/routes/whatsapp.routes.js"},
    @{Origem="~/seeagende/server/routes/admin.routes.js"; Destino="server/routes/admin.routes.js"},
    # Backend - Serviços
    @{Origem="~/seeagende/server/services/evolution-instances.js"; Destino="server/services/evolution-instances.js"},
    @{Origem="~/seeagende/server/services/whatsapp.js"; Destino="server/services/whatsapp.js"},
    # Backend - Config
    @{Origem="~/seeagende/server/config/database.js"; Destino="server/config/database.js"},
    @{Origem="~/seeagende/server/middlewares/auth.js"; Destino="server/middlewares/auth.js"},
    @{Origem="~/seeagende/server.js"; Destino="server.js"},
    # Frontend - Páginas
    @{Origem="~/seeagende/public/js/pages/whatsapp-config.js"; Destino="public/js/pages/whatsapp-config.js"},
    @{Origem="~/seeagende/public/js/pages/empresas.js"; Destino="public/js/pages/empresas.js"},
    @{Origem="~/seeagende/public/js/pages/dashboard.js"; Destino="public/js/pages/dashboard.js"},
    @{Origem="~/seeagende/public/js/ui.js"; Destino="public/js/ui.js"},
    @{Origem="~/seeagende/public/index.html"; Destino="public/index.html"},
    # Frontend - CSS
    @{Origem="~/seeagende/public/css/pages/whatsapp.css"; Destino="public/css/pages/whatsapp.css"},
    @{Origem="~/seeagende/public/css/pages/empresas.css"; Destino="public/css/pages/empresas.css"},
    @{Origem="~/seeagende/public/css/style.css"; Destino="public/css/style.css"},
    # Config
    @{Origem="~/seeagende/.env.local"; Destino=".env.local"},
    @{Origem="~/seeagende/.env.dev"; Destino=".env.dev"},
    @{Origem="~/seeagende/package.json"; Destino="package.json"}
)

$usuarioVPS = "ubuntu@163.176.218.131"

foreach ($arquivo in $arquivosVPS) {
    try {
        $cmd = "scp $usuarioVPS`:$($arquivo.Origem) $($arquivo.Destino)"
        Write-Host "  ⏳ Copiando: $($arquivo.Destino)" -ForegroundColor Gray
        Invoke-Expression $cmd
        Write-Host "  ✅ Copiado: $($arquivo.Destino)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Erro ao copiar: $($arquivo.Destino)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Todos os arquivos copiados!" -ForegroundColor Green
Write-Host ""

# 3. Atualizar dependências
Write-Host "📦 Atualizando dependências..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " FINALIZADO!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. npm start" -ForegroundColor White
Write-Host "2. http://localhost:3000" -ForegroundColor White
Write-Host "3. Teste o WhatsApp" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Para restaurar backup:" -ForegroundColor Yellow
Write-Host "   Copy-Item -Recurse backup_local_antes_vps/* ." -ForegroundColor White
Write-Host ""