# SaaSPlatformDev — Sistema Multitenant Base

Plataforma SaaS com isolamento de dados por cliente (schema-per-tenant no PostgreSQL).
Cada empresa que contratar o sistema recebe seu próprio namespace isolado no banco —
sem risco de dados de um cliente vazar para outro.

---

## Visão geral da arquitetura

```
                         ┌─────────────────────────┐
                         │  Nginx (SSL + proxy)     │
                         │  api.dominio → :3000     │
                         │  app.dominio → :3001     │
                         └────────┬────────┬────────┘
                                  │        │
                         ┌────────┘        └────────┐
                         │                          │
                  Fastify API                  Next.js 15
                  (Node.js)                   (Frontend)
                         │
             ┌───────────┴───────────┐
             │      PostgreSQL 15     │
             │                       │
             │  public schema        │  ← tenants, módulos, admin
             │  tenant_acme schema   │  ← dados isolados do cliente A
             │  tenant_xyz schema    │  ← dados isolados do cliente B
             └───────────────────────┘
```

O backend usa uma única conexão Prisma + `SET LOCAL search_path` dentro de
transações para "trocar de schema" a cada requisição sem abrir conexões extras.
Ver [apps/backend/src/core/database/prisma.ts](apps/backend/src/core/database/prisma.ts).

---

## Estrutura do repositório

```
SaaSPlatformDev/
├── apps/
│   ├── backend/          Node.js + Fastify — API REST principal
│   ├── frontend/         Next.js 15 — painel web dos tenants + landing
│   ├── laravel-base/     Template Laravel (base de referência)
│   └── laravel-brain/    Laravel + integração ERPNext/Frappe (em evolução)
│
├── docker/               Configs de infraestrutura usadas no compose
│   ├── nginx/            Reverse proxy + SSL termination
│   └── postgres/         Script de inicialização do banco
│
├── scripts/              Scripts de manutenção (SSL, backup, setup, security-scan)
├── rules/                Diretrizes de desenvolvimento do projeto
├── .agents/              Regras permanentes e skills para agentes
├── docs/                 Documentação operacional e de módulos
├── memory/               Vault Obsidian com conhecimento global curado (sem dados de tenants)
├── tools/
│   └── obsidian-memory-mcp/ Ferramenta MCP local, somente leitura, para agentes
│
├── docker-compose.yml           Stack de desenvolvimento local
├── docker-compose.prod.yml      Stack de produção
├── docker-compose.paperclip.yml Stack auxiliar Paperclip
└── deploy.sh                    Script de deploy na VPS
```

O acesso dos agentes ao vault e a política de memória isolada do SaaS estão
documentados em [docs/memoria-agentes.md](./docs/memoria-agentes.md).

---

## Apps

### Backend — `apps/backend/`

API REST construída com Fastify + TypeScript. Toda a lógica de negócio fica aqui.

**Tecnologias principais:**

| Lib | Para quê |
|---|---|
| Fastify 5 | Framework HTTP — schema-first, plugin ecosystem |
| Prisma 6 | ORM — queries tipadas, migrations do schema `public`, seed |
| PostgreSQL 15 | Banco com isolamento por schema por tenant |
| Zod | Validação de entrada em todas as rotas |
| JWT + bcrypt | Autenticação stateless com refresh token |

**Módulos / rotas registradas hoje:**

| Prefixo | Módulo | Descrição |
|---|---|---|
| `/auth` | Auth | Login, logout, refresh token |
| `/finia` | FinIA | Assistente financeiro pessoal via WhatsApp + IA |
| `/paperclip` | Paperclip | Agentes, tarefas e conversas com IA |
| `/memory` | Memory | Memória isolada por tenant/usuário |
| `/admin` | Admin | Painel superadmin — tenants, planos, CRM/ERP |

**Rodar localmente:**

```bash
cd apps/backend
cp .env.example .env   # edite as variáveis (se o exemplo existir no app)
npm install
npm run db:generate    # gera o client Prisma
npm run db:migrate:dev # aplica migrations
npm run db:seed        # popula módulos iniciais
npm run dev            # inicia em modo watch na porta 3000
```

**Scripts úteis:**

```bash
npm run db:studio   # Prisma Studio
npm run test        # Vitest
```

---

### Frontend — `apps/frontend/`

Painel web construído com Next.js 15 App Router. Cada tenant acessa via `/<slug>/`.

**Tecnologias principais:**

| Lib | Para quê |
|---|---|
| Next.js 15 | SSR/CSR, App Router, rotas dinâmicas por slug |
| Tailwind CSS | Estilização utility-first |
| Axios | Cliente HTTP com interceptors de JWT |
| TanStack Query | Estado de servidor |
| shadcn/ui | Componentes de UI |

**Estrutura de rotas (checkout atual):**

```
/                         Landing page pública
/admin/login              Login do painel superadmin
/admin/                   Painel superadmin
/<slug>/login             Login do tenant
/<slug>/dashboard         Dashboard do tenant (requer auth)
/<slug>/finia             Módulo FinIA
/<slug>/paperclip         Módulo Paperclip (agentes)
/<slug>/memoria           Módulo Memory
/<slug>/configuracoes     Configurações do tenant
```

**Rodar localmente:**

```bash
cd apps/frontend
# configure NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev   # inicia na porta 3001
```

---

### Laravel — `apps/laravel-base/` e `apps/laravel-brain/`

- **laravel-base:** template Laravel de referência.
- **laravel-brain:** integração Laravel + ERPNext/Frappe (em evolução; possui compose próprio em `apps/laravel-brain/`).

Não fazem parte do fluxo principal Fastify/Next.js descrito acima.

---

## Infraestrutura Docker

### Desenvolvimento

```bash
# PostgreSQL, pgAdmin, Redis e Evolution API (WhatsApp)
docker compose up -d --force-recreate

# Backend e frontend rodam fora do compose (npm run dev)
```

| Serviço | Porta (host) |
|---|---|
| Backend (Fastify) | 3000 |
| Frontend (Next.js) | 3001 |
| PostgreSQL | 5433 |
| pgAdmin | 5050 |
| Evolution API | 8080 |
| Redis | 6379 |

### Produção

```bash
docker compose -f docker-compose.prod.yml up -d
```

O arquivo `docker-compose.prod.yml` sobe postgres, backend, frontend, nginx e certbot.
Paperclip auxiliar: `docker-compose.paperclip.yml`.

---

## Variáveis de ambiente — Backend

Arquivo: `apps/backend/.env`

```env
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@localhost:5433/saas_dev

# JWT — gere com: openssl rand -hex 64
JWT_SECRET=<string de 64+ caracteres>
JWT_EXPIRES_IN=15m

# Segurança
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:3001

# Ambiente
NODE_ENV=development
PORT=3000
```

> Variáveis obrigatórias são validadas em `apps/backend/src/config/env.ts` na inicialização.

---

## Multi-tenancy — Como funciona

Cada tenant recebe um schema próprio no PostgreSQL: `tenant_<slug>`.

```sql
-- Schema do tenant "acme"
tenant_acme.*

-- Schema compartilhado (global)
public.tenants
public.modules
public.tenant_modules
public.admin_users
```

A troca de schema por requisição acontece via `withTenantSchema()` em
`apps/backend/src/core/database/prisma.ts` (`SET LOCAL search_path`).

---

## Autenticação

- **Access token** (JWT, tipicamente 15 min): header `Authorization: Bearer <token>` ou cookie `access_token`
- **Refresh token**: armazenado no banco como SHA-256; logout invalida no servidor

```
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

---

## Módulo Admin (superadmin)

Gestão de tenants, planos, módulos e integrações CRM/ERP sob o prefixo `/admin`.
Rotas de admin exigem autenticação e papel de superadmin.

---

## Deploy na VPS

```bash
./deploy.sh              # pull/build/restart conforme o script
./scripts/init-ssl.sh    # certificado SSL inicial (Let's Encrypt)
./scripts/security-scan.sh
```

Guia adicional: [docs/guia-deploy-hostinger.md](./docs/guia-deploy-hostinger.md).

---

## Regras e convenções

Ver pasta [rules/](rules/) e [`.agents/`](.agents/README.md).

Segurança, privacidade, autorização e integridade de dados prevalecem sobre
preferências de estética ou conveniência. Convenções detalhadas: `CLAUDE.md`.

Para higiene de pastas e alinhamento docs↔código, use a skill
`.agents/skills/repo-structure/SKILL.md` (abaixo das skills de segurança).

---

## Atualizações recentes

| Data | Tipo | Descrição |
|---|---|---|
| 2026-11-14 | chore | Limpeza Lista A: docs/órfãos de módulos ausentes, skill `repo-structure`, README alinhado ao checkout |
| 2026-11-14 | docs | Consolidada a precedência de segurança e padrões de qualidade |
| 2026-11-14 | docs | Aprovação para refatorações alinhada à governança |
| 2026-11-14 | test | Cobertas autenticação, isolamento e expiração das memórias |
| 2026-11-14 | fix | MCP local / Context7 e CORS/controles globais no backend |

Histórico: [docs/CHANGELOG_HISTORICO.md](./docs/CHANGELOG_HISTORICO.md).
Pendências de deploy: Seção 10 de `CLAUDE.md`.

---

## Documentação técnica

- [docs/relatorio-tecnico-sistema.md](./docs/relatorio-tecnico-sistema.md) — levantamento do estado observado
- [docs/memoria-agentes.md](./docs/memoria-agentes.md) — vault e memória SaaS
- [docs/integracao-paperclip.md](./docs/integracao-paperclip.md) — Paperclip
- [docs/modules/finia/README.md](./docs/modules/finia/README.md) — FinIA

> `docs/estrutura-sistema.md` ainda descreve módulos históricos ausentes no checkout;
> trate-o como legado até reescrita (Lista B/C do plano de reorganização).
