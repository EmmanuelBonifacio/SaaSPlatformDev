# meuProjetoSistemaCompleto — Estrutura Completa para Estudo

**Plataforma SaaS multi-tenant** com isolamento de schema por cliente,
hospedada em VPS Hostinger e conteinerizada com Docker.

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────┐
│  Nginx (SSL Termination)                    │
│  api.domínio → Backend :3000                │
│  app.domínio → Frontend :3001               │
└───────────────┬──────────────────┬──────────┘
                │                  │
         Fastify API         Next.js SSR
         (Backend)           (Frontend)
                │
     ┌──────────┴──────────┐
     │    PostgreSQL 15     │
     │  public schema       │
     │  tenant_xxx schema   │
     │  tenant_yyy schema   │
     └─────────────────────┘
```

---

## Backend — `apps/backend`

| Tecnologia | Versão | Onde/Como usada |
|---|---|---|
| **Node.js** | 20-alpine | Runtime de produção (Docker) |
| **TypeScript** | ^5.7 | Linguagem principal |
| **Fastify** | ^5.0 | Framework HTTP — todas as rotas da API REST |
| **Prisma** | ^6.0 | ORM para o schema `public` (tenants, módulos, usuários globais) |
| **PostgreSQL** | 15-alpine | Banco único com múltiplos schemas por tenant |
| **Socket.IO** | ^4.8 | WebSocket em tempo real para o módulo TV (controle de dispositivos) |
| **JWT (`@fastify/jwt`)** | ^10.0 | Autenticação — token no header ou cookie `httpOnly` |
| **Bcrypt** | ^6.0 | Hash de senhas dos usuários |
| **Zod** | ^3.23 | Validação de schemas de entrada nas rotas |
| **`@fastify/helmet`** | — | Headers de segurança (CSP, X-Frame-Options, HSTS 2 anos) |
| **`@fastify/rate-limit`** | — | 200 req/min global, 10 req/min no endpoint de login |
| **`@fastify/cors`** | — | CORS configurado dinamicamente por `NODE_ENV` |
| **`@fastify/multipart`** | — | Upload de imagens e vídeos (100 MB máx, módulo TV e outros) |
| **`@fastify/static`** | — | Serve `/uploads` (mídias) e `receiver.html` (app TV no browser) |
| **`@fastify/cookie`** | — | Cookie `httpOnly` como fallback para o JWT |
| **Vitest** | — | Testes unitários (módulo Xibo) |
| **tsx** | — | Hot reload no desenvolvimento (`npm run dev`) |

### Módulos do Backend

| Módulo | O que faz |
|---|---|
| **auth** | Login/refresh JWT, rate-limit, bcrypt |
| **estoque** | CRUD de produtos por tenant |
| **financeiro** | Lançamentos financeiros por tenant |
| **vendas** | Catálogo, pedidos, webhook WhatsApp |
| **tv** | Controle de dispositivos de digital signage, Socket.IO, UPnP/DIAL |
| **fleet** | Gestão de frota — integra Traccar, Fleetbase e FleetMS |
| **routes** | Otimização de rotas (GraphHopper + VROOM), despacho de ordens |
| **xibo** | Endpoint DataSet para Xibo CMS consumir dados de produtos |
| **admin** | Painel superadmin (CRUD tenants, módulos, usuários) |

### Estratégia Multi-tenant (PostgreSQL)

- Schema `public`: dados globais (Tenants, TenantModules, GlobalUsers, logs)
- Schema `tenant_{slug}` por cliente: todos os dados isolados (produtos, rotas, ordens, veículos…)
- Provisionamento via `tenant.provisioner.ts` — cria o schema completo com DDL puro ao criar um novo tenant
- `SET LOCAL search_path = tenant_xxx` em cada query para garantir isolamento

---

## Frontend — `apps/frontend`

| Tecnologia | Versão | Onde/Como usada |
|---|---|---|
| **Next.js** | 15.5.15 | Framework React com App Router (SSR + client components) |
| **React** | ^18.3 | UI declarativa |
| **TypeScript** | ^5 | Tipagem em todo o projeto |
| **Tailwind CSS** | ^3.4 | Estilização utilitária em todos os componentes |
| **Axios** | ^1.6 | Cliente HTTP para chamadas ao backend |
| **React Leaflet + Leaflet** | ^4.2 + ^1.9 | Mapas OpenStreetMap no módulo de Rotas |
| **Radix UI** | ^1.0 | Componentes headless acessíveis (Dialog, Dropdown, Tabs…) |
| **@dnd-kit/core** | — | Drag-and-drop no Kanban de Despacho |
| **Lucide React** | — | Ícones em toda a aplicação |
| **`qrcode`** | — | Geração de QR Code na impressão de OS (Ordens de Serviço) |

### Estrutura das Páginas (App Router)

| Rota | Módulo |
|---|---|
| `/` | Landing page (saas-platform-landing.tsx) |
| `/admin/*` | Painel superadmin |
| `/[slug]/dashboard` | Dashboard do tenant |
| `/[slug]/estoque` | Estoque |
| `/[slug]/financeiro` | Financeiro |
| `/[slug]/vendas/*` | Vendas |
| `/[slug]/tv/*` | Digital Signage (dispositivos, planos) |
| `/[slug]/frota/despacho` | Kanban de despacho + Rotas do dia |
| `/[slug]/frota/criar-rotas` | Otimizador de rotas com mapa |
| `/[slug]/frota/veiculos` | Gestão de veículos |
| `/[slug]/frota/motoristas` | Gestão de motoristas |
| `/[slug]/frota/manutencao` | Manutenção de frota |
| `/[slug]/frota/despacho/os/[id]` | Impressão de OS com QR Code |

---

## Motores Externos (Microserviços via Docker)

| Serviço | Porta | Propósito |
|---|---|---|
| **Traccar** | 8082 | Rastreamento GPS em tempo real dos veículos |
| **Fleetbase** | 4200 | Despacho, motoristas, ordens de serviço |
| **FleetMS** | 4000 | Manutenção, documentos (CRLV, seguro), abastecimento |
| **GraphHopper** | 8989 | Roteamento offline com OSM (dados de Minas Gerais) |
| **VROOM** | 3002 | Solver VRP — otimiza distribuição de paradas por veículo |

### Fluxo de Otimização de Rotas

```
Frontend → Backend → GraphHopper (calcula matriz de distâncias entre paradas)
                   → VROOM (resolve VRP: distribui paradas entre veículos)
                   → Retorna rotas otimizadas → Renderiza no Mapa Leaflet
```

---

## Infraestrutura & Deploy

| Ferramenta | Onde usada |
|---|---|
| **Docker + Docker Compose** | Orquestra todos os serviços (dev e prod) |
| **Nginx 1.25** | Reverse proxy com SSL (Hostinger VPS) |
| **Let's Encrypt + Certbot** | Certificado SSL com renovação automática a cada 12h |
| **Hostinger VPS** | Servidor de produção (`145.223.27.97`) |
| **Git** | Controle de versão |
| **SCP** | Deploy de arquivos alterados para o servidor (sem git pull no servidor) |

### Rede Docker de Produção

```
Internet → Nginx (porta 443/80 expostas)
               → rede internal (isolada)
                   → backend_prod  :3000
                   → frontend_prod :3001
                   → postgres_prod :5432
```

Apenas o Nginx tem portas expostas externamente. Backend e Frontend só se comunicam via rede interna Docker.

### Workflow de Deploy

```bash
# 1. Copiar arquivos alterados para o servidor
scp arquivo.tsx root@145.223.27.97:/var/www/meuProjetoSistemaCompleto/caminho/

# 2. Build sem cache (garante que alterações entram na imagem)
docker compose -f docker-compose.prod.yml build --no-cache backend

# 3. Recriar container
docker rm -f backend_prod
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

---

## Segurança

| Camada | Como implementada |
|---|---|
| **Autenticação** | JWT (1h expiração) + cookie `httpOnly` como fallback |
| **HTTPS** | Redirect 301 HTTP→HTTPS + HSTS 2 anos |
| **Rate Limiting** | 200 req/min global, 10 req/min no login |
| **Isolamento de dados** | Schema-per-tenant — um cliente jamais acessa dados de outro |
| **Headers** | Helmet: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff |
| **Senhas** | Bcrypt hash (rounds: 6) |
| **Autorização** | 3 middlewares em cadeia: tenant → módulo habilitado → role |

---

## Módulos do Produto (visão do cliente)

| Módulo | Descrição |
|---|---|
| **Estoque** | Cadastro e controle de produtos |
| **Financeiro** | Lançamentos e fluxo de caixa |
| **Vendas** | Pedidos via WhatsApp com catálogo digital |
| **TV / Digital Signage** | Controle remoto de displays com Xibo CMS integrado |
| **Frota** | Veículos, motoristas, manutenção, GPS em tempo real, Kanban de despacho e otimização de rotas com IA |

---

## Variáveis de Ambiente Principais

### Backend
```env
DATABASE_URL=postgresql://user:pass@postgres:5432/db
JWT_SECRET=minimo-32-caracteres
NODE_ENV=production
FRONTEND_URL=https://app.seudominio.com
GRAPHHOPPER_URL=http://graphhopper:8989
VROOM_URL=http://vroom:3002
TRACCAR_URL=http://traccar:8082
FLEETBASE_URL=http://fleetbase:4200
FLEETMS_URL=http://fleetms:4000
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com
```

---

## Comandos Úteis de Desenvolvimento

```bash
# Backend
npm run dev           # hot reload com tsx
npm run build         # compila TypeScript
npm run db:migrate:dev    # cria e aplica migration Prisma
npx prisma studio     # GUI do banco

# Frontend
npm run dev           # Next.js dev server (porta 3001)
npm run build         # build de produção
npm run lint          # ESLint

# Docker (desenvolvimento)
docker compose up -d  # sobe toda a stack

# Docker (produção)
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Resumo da Stack por Camada

```
┌─────────────────────────────────────────────────────────────┐
│  APRESENTAÇÃO    Next.js 15 + React 18 + Tailwind CSS       │
│  COMUNICAÇÃO     Axios (REST) + Socket.IO (WebSocket)       │
│  API             Fastify 5 + TypeScript + Zod               │
│  AUTENTICAÇÃO    JWT + Bcrypt + Helmet + Rate Limit         │
│  ORM             Prisma 6 (schema public)                   │
│  BANCO           PostgreSQL 15 (multi-schema por tenant)    │
│  ROTEAMENTO      GraphHopper (OSM) + VROOM (VRP solver)     │
│  FROTA           Traccar + Fleetbase + FleetMS              │
│  INFRA           Docker + Nginx + Let's Encrypt + Hostinger │
└─────────────────────────────────────────────────────────────┘
```
