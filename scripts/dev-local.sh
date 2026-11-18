#!/usr/bin/env bash
# Sobe o SaaS NA SUA MÁQUINA (Linux/macOS) — Docker + backend + frontend
# Uso (na raiz do repo):
#   chmod +x scripts/dev-local.sh
#   ./scripts/dev-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need() { command -v "$1" >/dev/null || { echo "Falta: $1"; exit 1; }; }
need docker
need npm
need node
need openssl

echo "=== SaaS local (sua maquina) ==="

echo "[1/6] Docker (postgres/redis/pgadmin)..."
docker compose up postgres redis-central pgadmin -d --force-recreate

echo "[2/6] Env backend/frontend..."
if [[ ! -f apps/backend/.env ]]; then
  cp apps/backend/.env.example apps/backend/.env
  JWT1="$(openssl rand -hex 64)"
  JWT2="$(openssl rand -hex 64)"
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT1}|" apps/backend/.env
  sed -i.bak "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT2}|" apps/backend/.env
  rm -f apps/backend/.env.bak
  echo "  Criado apps/backend/.env"
else
  echo "  apps/backend/.env ja existe"
fi

cat > apps/frontend/.env.local <<'EOF'
# Gerado por scripts/dev-local.sh — NAO use http://localhost:3000 no browser
NEXT_PUBLIC_API_URL=/backend
BACKEND_INTERNAL_URL=http://127.0.0.1:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
EOF
echo "  apps/frontend/.env.local = /backend"

echo "[3/6] npm install..."
[[ -d apps/backend/node_modules ]] || (cd apps/backend && npm install)
[[ -d apps/frontend/node_modules ]] || (cd apps/frontend && npm install)

echo "[4/6] Prisma migrate + seed..."
(cd apps/backend && npx prisma migrate deploy && npm run db:seed)

echo "[5/6] Backend + frontend..."
# mata processos antigos nestas portas se existirem (best-effort)
(lsof -ti:3000 | xargs -r kill) 2>/dev/null || true
(lsof -ti:3001 | xargs -r kill) 2>/dev/null || true

mkdir -p /tmp/saas-local-logs
(cd apps/backend && npm run dev) >/tmp/saas-local-logs/backend.log 2>&1 &
echo $! >/tmp/saas-local-logs/backend.pid
(cd apps/frontend && npm run dev) >/tmp/saas-local-logs/frontend.log 2>&1 &
echo $! >/tmp/saas-local-logs/frontend.pid

echo "[6/6] Demo tenant..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3000/health >/dev/null; then break; fi
  sleep 1
done
curl -sf http://127.0.0.1:3000/health >/dev/null || {
  echo "Backend nao subiu. Log: /tmp/saas-local-logs/backend.log"
  tail -40 /tmp/saas-local-logs/backend.log || true
  exit 1
}

node scripts/ensure-demo-tenant.mjs

echo ""
echo "=== PRONTO NA SUA MAQUINA ==="
echo "  http://localhost:3001/demo/login"
echo "  admin@demo.com / demo123456"
echo "  Admin: http://localhost:3001/admin/login"
echo "  admin@sistema.com / admin123_TROQUE_EM_PRODUCAO"
echo "Use so a porta 3001. Logs: /tmp/saas-local-logs/"
echo ""
