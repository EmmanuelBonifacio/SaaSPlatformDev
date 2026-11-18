# =============================================================================
# Sobe o SaaS NA SUA MÁQUINA (Windows) — Docker + backend + frontend
# Uso (PowerShell, na raiz do repo):
#   .\scripts\dev-local.ps1
# =============================================================================
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Comando '$name' nao encontrado. Instale e tente de novo."
  }
}

Write-Host ""
Write-Host "=== SaaS local (sua maquina) ===" -ForegroundColor Cyan
Require-Cmd docker
Require-Cmd npm
Require-Cmd node

# 1) Docker: postgres + redis + pgadmin
Write-Host "`n[1/6] Docker (postgres/redis/pgadmin)..." -ForegroundColor Yellow
docker compose up postgres redis-central pgadmin -d --force-recreate
if ($LASTEXITCODE -ne 0) { throw "docker compose falhou" }

# 2) Backend .env
Write-Host "`n[2/6] Env backend/frontend..." -ForegroundColor Yellow
$BackendEnv = Join-Path $Root "apps\backend\.env"
$BackendExample = Join-Path $Root "apps\backend\.env.example"
if (-not (Test-Path $BackendEnv)) {
  if (-not (Test-Path $BackendExample)) { throw "Falta apps/backend/.env.example" }
  Copy-Item $BackendExample $BackendEnv
  $jwt1 = -join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
  $jwt2 = -join ((1..64) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
  (Get-Content $BackendEnv) `
    -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwt1" `
    -replace 'JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$jwt2" |
    Set-Content $BackendEnv -Encoding UTF8
  Write-Host "  Criado apps/backend/.env com JWT gerados"
} else {
  Write-Host "  apps/backend/.env ja existe (mantido)"
}

$FrontEnv = Join-Path $Root "apps\frontend\.env.local"
$FrontExample = Join-Path $Root "apps\frontend\.env.local.example"
@"
# Gerado por scripts/dev-local.ps1 — NAO use http://localhost:3000 no browser
NEXT_PUBLIC_API_URL=/backend
BACKEND_INTERNAL_URL=http://127.0.0.1:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
"@ | Set-Content $FrontEnv -Encoding UTF8
Write-Host "  apps/frontend/.env.local = /backend (obrigatorio)"

# 3) npm install
Write-Host "`n[3/6] npm install..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "apps\backend")
if (-not (Test-Path "node_modules")) { npm install }
Pop-Location
Push-Location (Join-Path $Root "apps\frontend")
if (-not (Test-Path "node_modules")) { npm install }
Pop-Location

# 4) migrate + seed
Write-Host "`n[4/6] Prisma migrate + seed..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "apps\backend")
npx prisma migrate deploy
npm run db:seed
Pop-Location

# 5) Start backend + frontend em novas janelas
Write-Host "`n[5/6] Iniciando backend (:3000) e frontend (:3001)..." -ForegroundColor Yellow
$BackendDir = Join-Path $Root "apps\backend"
$FrontendDir = Join-Path $Root "apps\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontendDir'; npm run dev"

# 6) Demo tenant
Write-Host "`n[6/6] Aguardando backend e criando tenant demo..." -ForegroundColor Yellow
$ok = $false
for ($i = 1; $i -le 60; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $ok) { throw "Backend nao subiu em http://127.0.0.1:3000" }

node (Join-Path $Root "scripts\ensure-demo-tenant.mjs")

Write-Host ""
Write-Host "=== PRONTO NA SUA MAQUINA ===" -ForegroundColor Green
Write-Host "Abra no Edge/Chrome:"
Write-Host "  http://localhost:3001/demo/login"
Write-Host "  admin@demo.com / demo123456"
Write-Host "  Admin: http://localhost:3001/admin/login"
Write-Host "  admin@sistema.com / admin123_TROQUE_EM_PRODUCAO"
Write-Host ""
Write-Host "IMPORTANTE: use so a porta 3001. Nao abra :3000 no browser."
Write-Host ""
