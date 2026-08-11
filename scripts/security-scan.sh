#!/bin/bash
# =============================================================================
# scripts/security-scan.sh
# =============================================================================
# Varredura de segurança obrigatória antes de qualquer deploy.
# Referenciado na Seção 7 do CLAUDE.md.
#
# Uso:
#   ./scripts/security-scan.sh
#
# Exit code 0 = passou em tudo
# Exit code 1 = falha crítica (bloqueia deploy)
# =============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAILED=0
WARNINGS=0

red()    { echo -e "\033[0;31m$*\033[0m"; }
green()  { echo -e "\033[0;32m$*\033[0m"; }
yellow() { echo -e "\033[0;33m$*\033[0m"; }
bold()   { echo -e "\033[1m$*\033[0m"; }

bold "================================================================"
bold " Varredura de segurança — SaaS Multi-Tenant Platform"
bold " $(date)"
bold "================================================================"
echo ""

# -----------------------------------------------------------------------------
# 1. Auditoria de dependências
# -----------------------------------------------------------------------------
bold "=== 1. Auditoria de dependências npm ==="

for app_dir in apps/backend apps/frontend apps/mobile; do
  if [ -f "$app_dir/package.json" ]; then
    echo "→ Verificando $app_dir..."
    cd "$ROOT_DIR/$app_dir"
    if npm audit --audit-level=high 2>&1; then
      green "  OK: $app_dir sem vulnerabilidades críticas"
    else
      red "  FALHOU: vulnerabilidades críticas em $app_dir"
      FAILED=1
    fi
    cd "$ROOT_DIR"
  fi
done
echo ""

# -----------------------------------------------------------------------------
# 2. Busca por credenciais hardcoded
# -----------------------------------------------------------------------------
bold "=== 2. Busca por credenciais hardcoded ==="

SECRETS_FOUND=$(grep -rn --include="*.ts" --include="*.js" \
  -E "(password|secret|api_key|apikey|jwt_secret)\s*=\s*['\"][^'\"]{8,}" \
  apps/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=".next" \
  --exclude="*.test.ts" \
  --exclude="*.spec.ts" \
  2>/dev/null || true)

if [ -n "$SECRETS_FOUND" ]; then
  yellow "AVISO: possíveis credenciais hardcoded encontradas:"
  echo "$SECRETS_FOUND"
  WARNINGS=$((WARNINGS + 1))
else
  green "OK: nenhuma credencial hardcoded detectada"
fi
echo ""

# -----------------------------------------------------------------------------
# 3. Verifica que .env não está commitado
# -----------------------------------------------------------------------------
bold "=== 3. Verifica .env não commitado ==="

ENV_STAGED=$(git status --porcelain 2>/dev/null | grep -E "\.env$" | grep -v "\.env\.example" || true)
if [ -n "$ENV_STAGED" ]; then
  red "FALHOU: arquivo .env detectado no staging do git:"
  echo "$ENV_STAGED"
  FAILED=1
else
  green "OK: nenhum .env no git"
fi
echo ""

# -----------------------------------------------------------------------------
# 4. Verifica variáveis obrigatórias no .env.example
# -----------------------------------------------------------------------------
bold "=== 4. Variáveis obrigatórias no .env.example ==="

BACKEND_ENV_EXAMPLE="apps/backend/.env.example"
if [ -f "$BACKEND_ENV_EXAMPLE" ]; then
  required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "JWT_EXPIRES_IN"
    "BCRYPT_ROUNDS"
    "NODE_ENV"
    "ALLOWED_ORIGINS"
    "UPLOADS_DIR"
  )
  for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" "$BACKEND_ENV_EXAMPLE"; then
      echo "  OK: $var presente"
    else
      yellow "  AVISO: $var ausente do $BACKEND_ENV_EXAMPLE"
      WARNINGS=$((WARNINGS + 1))
    fi
  done
else
  yellow "AVISO: $BACKEND_ENV_EXAMPLE não encontrado"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# 5. Build limpo do backend
# -----------------------------------------------------------------------------
bold "=== 5. Build TypeScript (backend) ==="

if [ -f "apps/backend/package.json" ]; then
  cd "$ROOT_DIR/apps/backend"
  if npm run build 2>&1; then
    green "OK: build do backend sem erros"
  else
    red "FALHOU: erros de TypeScript no backend"
    FAILED=1
  fi
  cd "$ROOT_DIR"
fi
echo ""

# -----------------------------------------------------------------------------
# 6. Testes unitários
# -----------------------------------------------------------------------------
bold "=== 6. Testes unitários ==="

if [ -f "apps/backend/package.json" ]; then
  cd "$ROOT_DIR/apps/backend"
  if npm run test 2>&1; then
    green "OK: todos os testes passaram"
  else
    red "FALHOU: testes falhando"
    FAILED=1
  fi
  cd "$ROOT_DIR"
fi
echo ""

# -----------------------------------------------------------------------------
# 7. Verifica console.log em código de produção
# -----------------------------------------------------------------------------
bold "=== 7. Busca por console.log em código de produção ==="

CONSOLELOG_FOUND=$(grep -rn --include="*.ts" \
  "console\.log" \
  apps/backend/src/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  2>/dev/null || true)

if [ -n "$CONSOLELOG_FOUND" ]; then
  yellow "AVISO: console.log encontrado (use request.log ou app.log):"
  echo "$CONSOLELOG_FOUND"
  WARNINGS=$((WARNINGS + 1))
else
  green "OK: nenhum console.log no código de produção"
fi
echo ""

# -----------------------------------------------------------------------------
# Resultado final
# -----------------------------------------------------------------------------
bold "================================================================"
if [ $FAILED -eq 1 ]; then
  red " RESULTADO: FALHOU — deploy bloqueado"
  red " Corrija os erros acima antes de prosseguir."
  bold "================================================================"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  yellow " RESULTADO: PASSOU COM $WARNINGS AVISO(S)"
  yellow " Revise os avisos acima — deploy permitido mas atenção recomendada."
  bold "================================================================"
  exit 0
else
  green " RESULTADO: PASSOU — tudo limpo"
  bold "================================================================"
  exit 0
fi
