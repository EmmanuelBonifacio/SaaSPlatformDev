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
meuProjetoSistemaCompleto/
├── apps/
│   ├── backend/          Node.js + Fastify — API REST principal
│   ├── frontend/         Next.js 15 — painel web dos tenants + landing
│   ├── mobile/           React Native (Expo) — app dos motoristas
│   ├── laravel-base/     Template Laravel 12 (base de referência)
│   └── laravel-brain/    Laravel + integração ERPNext/Frappe (em desenvolvimento)
│
├── docker/               Configs dos serviços de infraestrutura
│   ├── graphhopper/      Motor de roteamento de rotas (OSM)
│   ├── nginx/            Reverse proxy + SSL termination
│   ├── postgres/         Script de inicialização do banco
│   ├── traccar/          Servidor de rastreamento GPS
│   └── vroom/            Solver de VRP (Vehicle Routing Problem)
│
├── scripts/              Scripts de manutenção (SSL, backup, setup)
├── rules/                Diretrizes de desenvolvimento do projeto
├── .agents/              Regras permanentes e skills para agentes
├── estruturaEstudo/      Documentação técnica detalhada para estudo
├── memory/               Vault Obsidian com conhecimento global curado (sem dados de tenants)
├── tools/
│   └── obsidian-memory-mcp/ Ferramenta MCP local, somente leitura, para agentes
│
├── docker-compose.yml    Stack de desenvolvimento local
├── docker-compose.prod.yml  Stack de produção
└── deploy.sh             Script de deploy na VPS
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
| Fastify 5 | Framework HTTP — rápido, schema-first, plugin ecosystem |
| Prisma 6 | ORM — queries tipadas, migrations, seed |
| PostgreSQL 15 | Banco com isolamento por schema por tenant |
| Socket.IO 4 | WebSocket para o módulo TV (controle em tempo real) |
| Zod | Validação de entrada em todas as rotas |
| JWT + bcrypt | Autenticação stateless com refresh token |

**Módulos disponíveis:**

| Prefixo | Módulo | Descrição |
|---|---|---|
| `/auth` | Auth | Login, logout, refresh token |
| `/estoque` | Estoque | Produtos, categorias, movimentação |
| `/financeiro` | Financeiro | Lançamentos, DRE, projeções |
| `/tv` | TV Digital | Dispositivos, playlists, Socket.IO cast |
| `/vendas` | Vendas/WhatsApp | Catálogo público, pedidos, webhook WPP |
| `/fleet` | Frota | Veículos, motoristas, manutenção, despacho |
| `/routes` | Rotas | Otimização de rotas (Vroom + GraphHopper) |
| `/api/driver` | Driver App | API exclusiva para o app mobile dos motoristas |
| `/admin` | Admin | Painel superadmin — gestão de tenants e planos |

**Rodar localmente:**

```bash
cd apps/backend
cp .env.example .env   # edite as variáveis
npm install
npm run db:generate    # gera o client Prisma
npm run db:migrate:dev # aplica migrations
npm run db:seed        # popula módulos iniciais
npm run dev            # inicia em modo watch na porta 3000
```

**Scripts úteis:**

```bash
npm run db:studio          # abre Prisma Studio (interface visual do banco)
npm run db:seed:demo-stores  # cria tenants de demonstração
npm run test               # executa os testes com Vitest
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
| shadcn/ui | Componentes de UI |

**Estrutura de rotas:**

```
/                         Landing page pública
/admin/login              Login do painel superadmin
/admin/                   Painel superadmin (requer role: superadmin)
/<slug>/login             Login do tenant
/<slug>/dashboard         Dashboard do tenant (requer auth)
/<slug>/estoque           Módulo de estoque
/<slug>/financeiro        Módulo financeiro
/<slug>/tv                Módulo TV digital
/<slug>/tv/dispositivos   Gestão de TVs
/<slug>/vendas            Catálogo público de vendas
/<slug>/vendas/admin      Admin de vendas (requer auth)
/<slug>/frota             Módulo de frota
/<slug>/frota/veiculos    Gestão de veículos
/<slug>/frota/motoristas  Gestão de motoristas
/<slug>/frota/manutencao  Manutenção preventiva
/<slug>/frota/ponto       Controle de ponto
/<slug>/frota/criar-rotas Otimização de rotas
/<slug>/configuracoes     Configurações do tenant
```

**Rodar localmente:**

```bash
cd apps/frontend
cp .env.local.example .env.local   # ou crie com NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev   # inicia na porta 3001
```

---

### Mobile — `apps/mobile/`

App React Native (Expo) para os motoristas. Roda no Android e iOS.

**Funcionalidades:**

- Login com JWT
- Visualização e aceite de rotas do dia
- Checklist de veículo com foto, assinatura e tipos de campo
- Controle de ponto (entrada/saída)
- Chat com o despachante (Socket.IO)
- Localização em background (expo-location)
- Fila offline para ações sem internet

**Rodar localmente:**

```bash
cd apps/mobile
npm install
npx expo start   # abre o QR code para o Expo Go
```

**Build para produção (EAS):**

```bash
npx eas build --platform android --profile production
```

---

## Infraestrutura Docker

### Desenvolvimento

```bash
# Sobe PostgreSQL, pgAdmin, Traccar, GraphHopper, Vroom
docker compose up -d

# Acompanhar logs
docker compose logs -f backend
```

### Produção

```bash
# Sobe backend, frontend, nginx, banco
docker compose -f docker-compose.prod.yml up -d
```

O arquivo `docker-compose.prod.yml` usa imagens buildadas a partir dos Dockerfiles
em cada app. O Nginx faz SSL termination e proxy reverso.

---

## Variáveis de ambiente — Backend

Arquivo: `apps/backend/.env`

```env
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@localhost:5433/saas_multitenant_db

# JWT — gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<string de 64+ caracteres>
JWT_REFRESH_SECRET=<string diferente de JWT_SECRET, 64+ caracteres>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Segurança
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:3001

# Uploads
UPLOADS_DIR=/caminho/para/uploads

# Ambiente
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
```

> `JWT_SECRET` e `JWT_REFRESH_SECRET` são validados pelo `env.ts` na inicialização.
> O servidor não sobe se qualquer variável obrigatória estiver ausente ou inválida.

---

## Multi-tenancy — Como funciona

Cada tenant recebe um schema próprio no PostgreSQL: `tenant_<slug>`.

```sql
-- Schema do tenant "acme"
tenant_acme.users
tenant_acme.products
tenant_acme.transactions
-- ... etc

-- Schema compartilhado (global)
public.tenants        -- registro dos clientes
public.modules        -- lista de módulos disponíveis
public.tenant_modules -- quais módulos cada cliente tem ativo
public.admin_users    -- usuários do painel superadmin
```

A troca de schema por requisição acontece via `withTenantSchema()`:

```typescript
// apps/backend/src/core/database/prisma.ts
const produtos = await withTenantSchema(request.tenant.schemaName, async (tx) => {
  return tx.$queryRaw`SELECT * FROM products WHERE active = true`;
});
```

Internamente, essa função abre uma transação e executa
`SET LOCAL search_path TO "tenant_acme", public` antes das queries.
O `SET LOCAL` garante que o search_path reseta automaticamente ao fim da transação,
mantendo isolamento total entre requisições concorrentes.

---

## Autenticação

O fluxo usa dois tokens:

- **Access token** (JWT, 15 min): enviado no header `Authorization: Bearer <token>`
  ou no cookie `access_token` (httpOnly)
- **Refresh token** (string hex 64 bytes, 30 dias): armazenado no banco como SHA-256.
  Usado para renovar o access token sem novo login.

```
POST /auth/login    → retorna { access_token, refresh_token }
POST /auth/refresh  → troca refresh_token por novo par de tokens
POST /auth/logout   → invalida o refresh_token no banco
```

---

## Módulo Admin (superadmin)

```
POST   /admin/login                   → autentica como superadmin
GET    /admin/stats                   → dashboard geral do SaaS
GET    /admin/tenants                 → lista todos os clientes
POST   /admin/tenants                 → cria e provisiona novo cliente
PATCH  /admin/tenants/:id/suspend     → suspende acesso imediato
PATCH  /admin/tenants/:id/reactivate  → reativa cliente suspenso
PATCH  /admin/tenants/:id/modules     → liga/desliga módulo por cliente
DELETE /admin/tenants/:id             → remove cliente e schema
```

O `adminMiddleware` verifica `role: "superadmin"` no JWT em todas essas rotas.
O token do admin usa `tenantId: "system"` no payload (admins não pertencem a tenant).

---

## Deploy na VPS

Ver [comoFazerDeploy.md](comoFazerDeploy.md) para o guia completo.
Resumo:

```bash
./deploy.sh        # pull, build e restart dos containers
./scripts/init-ssl.sh  # certificado SSL inicial (Let's Encrypt)
```

---

## Regras e convenções

Ver pasta [rules/](rules/) para as diretrizes do projeto:

- `rules/general.md` — boas práticas gerais
- `rules/tenants.md` — como criar e configurar tenants
- `rules/cors.md` — regras de configuração de CORS

As regras e skills permanentes dos agentes ficam em [`.agents/`](.agents/README.md).
Segurança, privacidade, autorização e integridade de dados prevalecem sobre
preferências de estética ou conveniência. As convenções de código, frontend e
documentação viva estão descritas nas regras dos agentes e em `CLAUDE.md`.

---

## Atualizações recentes

| Data | Tipo | Descrição |
|---|---|---|
| 2026-11-16 | feat | Painel agentes fase 1 (SP-18/20): shell multi-rota `/[slug]/agents/*` (Dashboard, Agents, Tasks, Approvals), CRUD de agente, detalhe de task, service de update/approvals. Auth SaaS; sem login Paperclip. |
| 2026-11-15 | breaking | SP-7 limpeza residual: remove ponte `modules/paperclip`, catálogo `agents`, DROP `paperclip_*` só opt-in. Ver [docs/agents/agents-cleanup.md](./docs/agents/agents-cleanup.md). |
| 2026-11-15 | breaking | SP-7 fase 5: desliga dual-mode `/paperclip`; UI nativa `/agents`. Ver [docs/agents/agents-cutover.md](./docs/agents/agents-cutover.md). |
| 2026-11-15 | feat | SP-7 fase 4: client interno (`createAgentsInternalClient` + `@saasplatform/agents-sdk` + frontend `/agents`). Ver [docs/agents/agents-client.md](./docs/agents/agents-client.md). |
| 2026-11-15 | feat | SP-7 fase 3: API Fastify nativa `/agents` (CRUD agentes/tasks/comments/runs/approvals) com JWT + `withTenantSchema`; sem HTTP Paperclip. Ver [docs/agents/agents-api-v1.md](./docs/agents/agents-api-v1.md). |
| 2026-11-15 | feat | SP-7 fase 2: DDL nativo de agentes no provisioner/tenant (`agents`, tasks, comments, runs, approvals, activity). Upgrade aditivo documentado; sem drop de `paperclip_*`. Ver [docs/agents/agents-schema-upgrade.md](./docs/agents/agents-schema-upgrade.md). |
| 2026-11-14 | docs | Consolidada a precedência de segurança e definidos padrões de qualidade, frontend e documentação viva. |
| 2026-11-14 | docs | Alinhada a aprovação para refatorações aos gates definidos na governança. |
| 2026-11-14 | test | Cobertas autenticação, isolamento por usuário/tenant e expiração das memórias. |
| 2026-11-14 | fix | Corrigidos o lançamento stdio do vault MCP e a configuração do Context7 para os agentes do workspace. |
| 2026-11-14 | fix | Corrigidos o escopo dos controles globais e o callback CORS assíncrono para o frontend local. |

O histórico completo de releases está em
[docs/CHANGELOG_HISTORICO.md](./docs/CHANGELOG_HISTORICO.md). Mudanças significativas
aguardando deploy são acompanhadas na Seção 10 de `CLAUDE.md`.

---

## Documentação técnica

Ver [estruturaEstudo/sistema-completo.md](estruturaEstudo/sistema-completo.md)
para a documentação detalhada de cada módulo, tecnologia e decisão de arquitetura.

Agentes embed (SP-7): [docs/agents/](./docs/agents/) — upgrade de schema em [agents-schema-upgrade.md](./docs/agents/agents-schema-upgrade.md).
