# Rodar o sistema NA SUA MÁQUINA (não no Cursor Cloud)

O Cloud Agent roda numa VM remota. `localhost` no seu Edge é o **seu PC**.
Por isso `ERR_CONNECTION_REFUSED` aparece se você abrir `localhost:3001` sem o
sistema estar instalado **aí**.

Este guia sobe tudo **localmente**: dados e API ficam no seu computador.

## Pré-requisitos

- Docker Desktop (ligado)
- Node.js 20+
- Git
- Windows: PowerShell | Linux/macOS: bash

## Subir (recomendado)

### Windows (PowerShell)

```powershell
cd caminho\para\SaaSPlatformDev
git fetch origin
git checkout cursor/apply-auth-proxy-checklist-694c
git pull
.\scripts\dev-local.ps1
```

### Linux / macOS

```bash
cd caminho/para/SaaSPlatformDev
git fetch origin
git checkout cursor/apply-auth-proxy-checklist-694c
git pull
chmod +x scripts/dev-local.sh
./scripts/dev-local.sh
```

O script:

1. Sobe Postgres/Redis/pgAdmin no Docker  
2. Cria `.env` do backend (se não existir) e `.env.local` do frontend com `/backend`  
3. Instala deps, migra e faz seed  
4. Abre backend `:3000` e frontend `:3001`  
5. Cria tenant `demo` + usuário de teste  

## Abrir no navegador

- Tenant: http://localhost:3001/demo/login  
  - `admin@demo.com` / `demo123456`
- Admin: http://localhost:3001/admin/login  
  - `admin@sistema.com` / `admin123_TROQUE_EM_PRODUCAO`

**Use só a porta 3001.** Não abra `:3000` no browser (isso quebra o proxy e pode
voltar o loop de carregamento).

## Regra anti-loop (obrigatória)

Em `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=/backend
BACKEND_INTERNAL_URL=http://127.0.0.1:3000
```

Nunca `NEXT_PUBLIC_API_URL=http://localhost:3000`.

## Parar

- Windows: feche as janelas PowerShell do backend/frontend; `docker compose stop`
- Linux/macOS: mate os PIDs em `/tmp/saas-local-logs/*.pid` e `docker compose stop`
