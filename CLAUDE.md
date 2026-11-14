# CLAUDE.md — SaaSPlatformDev Core (Plataforma Multi-Tenant Base)

> Leia este arquivo inteiro antes de tocar qualquer código. Cada seção existe por um motivo concreto.

---

## 1. VISÃO GERAL DO PROJETO

Plataforma SaaS Multi-Tenant Base (Template/Boilerplate) monorepo:

| App | Caminho | Stack |
|-----|---------|-------|
| Backend (API) | `apps/backend/` | Node.js 20, Fastify 5, TypeScript 5.7, Prisma 6, PostgreSQL 15 |
| Frontend (Painel web) | `apps/frontend/` | Next.js 15 App Router, React 18, Tailwind 3, shadcn/ui, TanStack Query |
| Laravel Brain | `apps/laravel-brain/` | Laravel + ERPNext/Frappe (em evolução; `composer install` local) |

**Isolamento de dados:** cada tenant tem seu próprio schema PostgreSQL (`tenant_<slug>`). O mecanismo é `SET LOCAL search_path` dentro de `withTenantSchema()` — NUNCA acesse dados de tenant fora dessa função.

---

## 2. COMANDOS ESSENCIAIS

```bash
# Desenvolvimento
docker compose up -d          # Sobe PostgreSQL, pgAdmin, Redis, Evolution API
npm run dev                   # tsx watch — reinicia em < 1s

# Build & Testes
npm run build                 # tsc → dist/
npm run test                  # vitest
npm run test:coverage         # cobertura mínima 80%
npm run lint                  # eslint --max-warnings 0

# Banco de dados
npx prisma migrate dev        # schema public (tabelas globais) APENAS
npx prisma generate           # regenerar client após mudar schema.prisma
npx prisma studio             # GUI local (dev only)

# Deploy
./scripts/deploy.sh           # ver Seção 9 — Workflow de Deploy

# Segurança
npm audit --audit-level=high  # verificar antes de qualquer PR
./scripts/security-scan.sh    # script de varredura (ver Seção 7)

# Context7 — documentação de bibliotecas (ver Seção 16)
# Sempre que houver erro ou implementação nova com lib externa:
# 1. Use resolve-library-id para encontrar o ID
# 2. Use get-library-docs com o tópico relevante
```

---

## 2.1 STARTUP CORRETO DO SISTEMA (OBRIGATÓRIO LER)

> Siga esta sequência exata para evitar os erros conhecidos na inicialização.

### Passo 1 — Subir Docker com recriação garantida
```bash
# IMPORTANTE: use --force-recreate para garantir que o postgres tenha
# o bind de porta correto (0.0.0.0:5433->5432/tcp).
# Sem isso, um container antigo pode subir sem o mapeamento de porta
# e o Prisma não conseguirá conectar em localhost:5433.
docker compose up postgres pgadmin redis-central evolution-api -d --force-recreate
```

> **Por que --force-recreate?** Garante o mapeamento `5433:5432` mesmo se um
> container antigo tiver sido criado sem esse bind.

### Passo 2 — Verificar e aplicar migrations pendentes
```bash
cd apps/backend

# Verifica se há migrations pendentes (deve exibir "Database schema is up to date!")
npx prisma migrate status

# Se houver divergência (schema.prisma editado sem migration):
npx prisma migrate dev --name <nome_da_mudanca>

# Em produção (nunca use migrate dev em prod):
npx prisma migrate deploy
```

> **Problema conhecido:** editar o `schema.prisma` sem rodar `migrate dev` faz o
> Prisma reportar "up to date" mas o banco fica sem as novas colunas/tabelas.
> Isso causa erros como `The column 'tenants.plano_id' does not exist`.
> Sempre que adicionar campos ao schema, crie a migration imediatamente.

### Passo 3 — Iniciar backend e frontend
```bash
# Terminal 1 — Backend (porta 3000)
cd apps/backend && npm run dev

# Terminal 2 — Frontend (porta 3001)
cd apps/frontend && npm run dev
```

### Verificação final
```bash
# Backend health
curl http://localhost:3000/health

# Admin login (usuário padrão criado pelo seed)
# email: admin@sistema.com
# senha: admin123_TROQUE_EM_PRODUCAO
```

### Resumo de portas
| Serviço | Porta |
|---|---|
| Backend (Fastify) | 3000 |
| Frontend (Next.js) | 3001 |
| PostgreSQL (host) | 5433 |
| pgAdmin | 5050 |
| Evolution API | 8080 |
| Redis | 6379 |

---

## 2.2 PROBLEMAS CONHECIDOS / CONTROLES QUE NÃO SE REVERTEM

### TLS em chamadas HTTPS do backend (Node.js)

Falhas de validação TLS devem ser corrigidas com CA confiável configurada —
**nunca** com `rejectUnauthorized: false` ou `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### Módulos runtime atuais

Rotas registradas: `/auth`, `/finia`, `/paperclip`, `/memory`, `/admin`.
Não reintroduza documentação ou código de frota/TV/estoque/vendas/mobile como se
estivessem ativos sem implementação no checkout.

---

## 3. ARQUITETURA — REGRAS QUE NÃO SE QUEBRAM

### 3.1 Multi-tenancy
- **TODA** query de dados de tenant passa por `withTenantSchema(tenantId, async (prisma) => {...})`
- Jamais instancie `new PrismaClient()` fora de `core/database/prisma.ts`
- Jamais use `prisma.table.findMany()` sem garantir que o search_path foi setado
- Tabelas globais (tenants, modules, admin_users) ficam no schema `public` — use o client global
- Tabelas de tenant (users, finia_*, paperclip_*, agent_memories...) ficam em `tenant_<slug>` — use `withTenantSchema`

### 3.2 Módulos Fastify
- Cada módulo é um plugin registrado em `server.ts` (`/auth`, `/finia`, `/paperclip`, `/memory`, `/admin`)
- Um erro dentro de um plugin não pode vazar para outro — use `try/catch` em handlers assíncronos
- Schemas de validação ficam em `modules/<nome>/<nome>.schema.ts` (Zod)
- Handlers ficam em `modules/<nome>/<nome>.controller.ts`
- Lógica de negócio fica em `modules/<nome>/<nome>.service.ts`
- Nunca coloque lógica de negócio no controller

### 3.3 Frontend
- Rotas protegidas ficam sob `app/[slug]/` — o layout verifica JWT no localStorage
- Chamadas à API usam a instância Axios de `services/api.ts` — NUNCA `fetch()` direto
- Estado de servidor = TanStack Query; estado de UI local = useState/useReducer
- Componentes reutilizáveis ficam em `src/components/ui/` (shadcn/ui)

### 3.4 Documentação viva
- Fonte de verdade de módulos: `server.ts` + seeds + rotas frontend
- Skill de pastas: `.agents/skills/repo-structure/SKILL.md` (abaixo da segurança)

---

## 4. REGRAS DE CÓDIGO LIMPO

### TypeScript
- `strict: true` sempre — sem `any`, sem `as unknown as X`, sem `// @ts-ignore`
- Prefira `type` para shapes de dados, `interface` para contratos de objetos extensíveis
- Erros tipados: crie classes de erro específicas em `core/errors/` — não lance `new Error('string genérica')`
- Funções com mais de 3 parâmetros obrigatórios → use objeto de opções tipado

### Organização
- Máximo 200 linhas por arquivo — se passar, divida em módulos menores
- Máximo 30 linhas por função — se passar, extraia funções auxiliares
- Imports organizados: libs externas → libs internas → arquivos do projeto
- Sem código comentado no repositório — use `git stash` ou branch

### Convenções de nomenclatura
- Arquivos: `kebab-case.ts`
- Classes/Tipos/Interfaces: `PascalCase`
- Funções/variáveis: `camelCase`
- Constantes globais: `SCREAMING_SNAKE_CASE`
- Schemas Zod: sufixo `Schema` (ex: `createProductSchema`)
- DTOs: sufixo `Dto` (ex: `CreateProductDto`)

### O que NUNCA fazer
- Nunca armazene segredo, token, senha ou chave privada no código-fonte
- Nunca commite `.env` — use `.env.example` com valores fictícios
- Nunca use `console.log` em produção — use o logger Pino (`request.log.info(...)`)
- Nunca desabilite regras ESLint com `eslint-disable` sem comentário justificando
- Nunca faça `SELECT *` via Prisma — selecione apenas os campos necessários
- Nunca use `prisma.$executeRaw` com interpolação de string — use tagged template literal
- Nunca corrija um erro de biblioteca sem consultar o Context7 primeiro (ver Seção 16)
- Nunca assuma a API de uma lib pela memória — versões mudam, consulte a documentação real

---

## 5. SEGURANÇA — CHECKLIST OBRIGATÓRIO

> **Todo PR que toca auth, banco, rotas ou dependências DEVE passar por este checklist.**

### 5.1 Autenticação & Autorização
- [ ] JWT_SECRET ≥ 64 caracteres (validado pelo Zod no boot em `config/env.ts`)
- [ ] Access token expira em 15 min (`JWT_EXPIRES_IN=15m`)
- [ ] Refresh token armazenado como SHA-256 — nunca o token em claro no banco
- [ ] Toda rota protegida tem `preHandler: [app.authenticate]`
- [ ] Rotas de admin têm `preHandler: [app.authenticate, requireRole('admin')]`
- [ ] RBAC verificado no service, não apenas no middleware (defense in depth)
- [ ] Logout invalida o refresh token no banco (não é apenas client-side)

### 5.2 Validação de Entrada
- [ ] Todo body de POST/PUT/PATCH tem schema Zod associado na rota Fastify
- [ ] IDs recebidos como params são validados como UUID antes de qualquer query
- [ ] Uploads de arquivo têm validação de MIME type, tamanho máximo e extensão
- [ ] Parâmetros de paginação têm limites (ex: `limit` máximo 100)
- [ ] Queries de busca têm tamanho máximo para evitar ReDoS

### 5.3 Banco de Dados
- [ ] Todas as queries de tenant passam por `withTenantSchema()` — sem exceção
- [ ] `prisma.$executeRaw` usa tagged template literal (ex: `prisma.$executeRaw\`SELECT...\``)
- [ ] Dados sensíveis no banco são criptografados com `pgcrypto` onde aplicável
- [ ] Migrations não contêm dados reais ou credenciais
- [ ] Connection pool configurado (`DATABASE_POOL_MAX` no `.env`)

### 5.4 Headers & Rede
- [ ] Helmet configurado com CSP restritivo em `server.ts`
- [ ] CORS permite apenas origens listadas em `ALLOWED_ORIGINS` do `.env`
- [ ] Rate limit global: 200 req/min/IP
- [ ] Rate limit em `/auth/login`: 5 req/15min/IP
- [ ] Rate limit em `/auth/refresh`: 10 req/min/IP
- [ ] Nginx não expõe versão do servidor (`server_tokens off`)
- [ ] HSTS habilitado em produção (2 anos)

### 5.5 Dados Sensíveis
- [ ] Campos `password`, `token`, `authorization`, `secret` marcados como `redact` no Pino
- [ ] Respostas de erro não vazam stack trace em produção (`NODE_ENV=production`)
- [ ] Logs não contêm dados pessoais (CPF, telefone, endereço completo)
- [ ] Credenciais de engines externos ficam no banco/config protegida — nunca hardcoded no código

### 5.6 Dependências
- [ ] `npm audit --audit-level=high` sem vulnerabilidades críticas antes de merge
- [ ] Nenhum pacote com versão `*` ou `latest` no `package.json`
- [ ] Dependências de dev não chegam ao bundle de produção
- [ ] `npm ci` em CI/CD (não `npm install`) para build determinístico

### 5.7 Exposição de Dados
- [ ] Respostas da API nunca retornam `password_hash`
- [ ] Respostas da API nunca retornam tokens internos ou IDs de sessão internos
- [ ] Paginação implementada em todos os endpoints de listagem
- [ ] Endpoint de busca não permite enumerar todos os registros sem filtro
- [ ] IDs internos do banco expostos na API são UUIDs (não auto-increment)

---

## 6. PADRÕES POR MÓDULO

### Criando um novo módulo
Siga esta estrutura exatamente — não invente variações:

```
modules/
└── meu-modulo/
    ├── meu-modulo.controller.ts   # handlers HTTP (thin layer)
    ├── meu-modulo.service.ts      # lógica de negócio
    ├── meu-modulo.schema.ts       # schemas Zod de validação
    ├── meu-modulo.types.ts        # tipos TypeScript do módulo
    ├── meu-modulo.routes.ts       # definição das rotas Fastify
    └── meu-modulo.test.ts         # testes unitários do service
```

Registro no `server.ts`:
```typescript
app.register(import('./modules/meu-modulo/meu-modulo.routes'), {
  prefix: '/api/meu-modulo',
});
```

### Criando uma nova rota
```typescript
// Controller: só chama service, trata erros HTTP
async function createItem(request: FastifyRequest, reply: FastifyReply) {
  const dto = createItemSchema.parse(request.body);   // valida
  const tenantId = request.user.tenantId;             // do JWT
  const item = await itemService.create(tenantId, dto);
  return reply.code(201).send(item);
}

// Route: declara schema para validação automática do Fastify
fastify.post('/', {
  preHandler: [fastify.authenticate],
  schema: { body: zodToJsonSchema(createItemSchema) },
  handler: createItem,
});
```

### Criando uma nova query de tenant
```typescript
// CORRETO
const products = await withTenantSchema(tenantId, (prisma) =>
  prisma.product.findMany({
    select: { id: true, name: true, price: true },  // nunca SELECT *
    where: { active: true },
    take: params.limit,
    skip: params.offset,
  })
);

// ERRADO — nunca faça isso
const products = await prisma.product.findMany(); // sem tenant schema!
```

---

## 7. VARREDURA DE SEGURANÇA

Antes de qualquer deploy, execute:

```bash
#!/bin/bash
# scripts/security-scan.sh

echo "=== 1. Auditoria de dependências ==="
npm audit --audit-level=high
if [ $? -ne 0 ]; then echo "FALHOU: vulnerabilidades críticas encontradas"; exit 1; fi

echo "=== 2. Busca por segredos no código ==="
# Detecta padrões de chaves, tokens, senhas hardcoded
grep -rn --include="*.ts" --include="*.js" \
  -E "(password|secret|api_key|apikey|token|jwt_secret)\s*=\s*['\"][^'\"]{8,}" \
  apps/ --exclude-dir=node_modules --exclude-dir=dist
if [ $? -eq 0 ]; then echo "AVISO: possíveis credenciais hardcoded encontradas"; fi

echo "=== 3. Verifica .env não commitado ==="
git status --porcelain | grep "\.env$" | grep -v "\.env\.example"
if [ $? -eq 0 ]; then echo "FALHOU: arquivo .env detectado no git"; exit 1; fi

echo "=== 4. Verifica variáveis obrigatórias no .env.example ==="
required_vars=("DATABASE_URL" "JWT_SECRET" "BCRYPT_ROUNDS" "NODE_ENV" "ALLOWED_ORIGINS")
for var in "${required_vars[@]}"; do
  grep -q "^${var}=" .env.example || echo "AVISO: ${var} ausente do .env.example"
done

echo "=== 5. Build limpo ==="
npm run build
if [ $? -ne 0 ]; then echo "FALHOU: build com erros TypeScript"; exit 1; fi

echo "=== 6. Testes ==="
npm run test
if [ $? -ne 0 ]; then echo "FALHOU: testes falhando"; exit 1; fi

echo "=== Varredura completa ==="
```

---

## 8. VARIÁVEIS DE AMBIENTE

O arquivo `config/env.ts` valida tudo no boot. Nunca acesse `process.env.X` diretamente — use `env.X` do módulo de config.

**Obrigatórias em produção:**

```bash
# .env.example — valores fictícios, nunca reais
NODE_ENV=production
PORT=3000

# Banco
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
DATABASE_POOL_MAX=10

# Auth (JWT_SECRET DEVE ter >= 64 chars)
JWT_SECRET=SUBSTITUA_POR_STRING_ALEATORIA_DE_64_CHARS_MINIMO_USE_OPENSSL
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30

# Segurança
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=https://app.seudominio.com,https://admin.seudominio.com

# Expo Push
EXPO_ACCESS_TOKEN=sua_chave_expo

# FinIA / Evolution / Paperclip (ver apps/backend/src/config/env.ts)
EVOLUTION_API_HOST=http://localhost:8080
PAPERCLIP_API_URL=http://localhost:3100
```

Para gerar `JWT_SECRET` seguro:
```bash
openssl rand -hex 64
```

---

## 9. WORKFLOW DE DEPLOY

### 9.1 Pré-deploy (obrigatório)
```bash
# 1. Varredura de segurança completa
./scripts/security-scan.sh

# 2. Verifica se há migrations pendentes
npx prisma migrate status

# 3. Tag de versão
git tag -a v$(date +%Y%m%d-%H%M) -m "deploy: $(git log -1 --pretty=%s)"
```

### 9.2 Deploy em produção
```bash
#!/bin/bash
# scripts/deploy.sh

set -e  # para imediatamente em qualquer erro

echo "[deploy] Iniciando deploy $(date)"

# Backup do banco antes de qualquer migration
echo "[deploy] Backup do banco..."
docker exec postgres pg_dump -U $DB_USER $DB_NAME > backups/pre-deploy-$(date +%Y%m%d-%H%M).sql

# Pull das imagens atualizadas
docker compose -f docker-compose.prod.yml pull

# Roda migrations (schema public apenas)
echo "[deploy] Aplicando migrations..."
npx prisma migrate deploy

# Reinicia containers com zero-downtime
echo "[deploy] Reiniciando serviços..."
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker compose -f docker-compose.prod.yml up -d --no-deps --build frontend

# Health check
echo "[deploy] Verificando saúde dos serviços..."
sleep 10
curl -f http://localhost:3000/health || (echo "FALHOU: backend não respondeu"; exit 1)
curl -f http://localhost:3001 || (echo "FALHOU: frontend não respondeu"; exit 1)

echo "[deploy] Deploy concluído com sucesso $(date)"
```

### 9.3 Rollback
```bash
# scripts/rollback.sh
VERSION=$1  # ex: ./scripts/rollback.sh v20241201-1430
git checkout $VERSION
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend frontend
```

---

## 10. CHANGELOG DE MODIFICAÇÕES

> **Como usar:** esta seção acompanha apenas modificações significativas aguardando deploy; adicione uma linha aqui antes de commitar.
> O `README.md` mantém um resumo conciso das mudanças de código, configuração, dependências e comportamento, além de apontar para este controle e para o histórico publicado.
> Após deploy confirmado em produção, mova a linha daqui para `docs/CHANGELOG_HISTORICO.md` e apague daqui. Esta seção deve ficar sem changelogs pendentes após cada deploy estável.

### Em andamento (aguardando deploy)

<!-- Formato: DATA | TIPO | DESCRIÇÃO | ARQUIVOS AFETADOS | AUTOR -->
<!-- TIPO: feat | fix | security | refactor | breaking -->
<!-- Exemplo:
2024-12-01 | feat | Novo módulo de relatórios PDF | modules/reports/ | dev
2024-12-01 | security | Rate limit mais restritivo em /auth/login | server.ts | dev
-->

2026-11-14 | chore | Limpeza Lista B+C: órfãos, provisioner enxuto, docs taxonomy, deploy em scripts/, skill repo-structure | monorepo | Copilot
2026-11-14 | chore | Limpeza Lista A (docs/órfãos de módulos ausentes), skill `repo-structure`, README alinhado ao checkout | `docs/`, `scripts/`, `apps/backend/public/`, `.agents/`, `README.md` | Copilot
2026-11-14 | docs | Precedência de segurança e padrões de qualidade, frontend e documentação viva | `.agents/`, `README.md`, `CLAUDE.md` | Copilot
2026-11-14 | docs | Aprovação de refatorações alinhada às regras de governança | `.agents/skills/safe-refactor/SKILL.md`, `README.md`, `CLAUDE.md` | Copilot
2026-11-14 | fix | Handler global de validação registrado antes das rotas para respostas 400 consistentes | `apps/backend/src/server.ts` | Copilot
2026-11-14 | fix | Corrigidos stdio do MCP local e pacote Context7 para descoberta no workspace | `.mcp.json`, `docs/memoria-agentes.md` | Copilot
2026-11-14 | fix | Controles globais aplicados no escopo raiz e callback CORS alinhado ao modo assíncrono do plugin | `apps/backend/src/server.ts`, `apps/backend/src/plugins/security.ts` | Copilot

---

### Instruções para o changelog

**Adicionar entrada:**
```
DATA | TIPO | DESCRIÇÃO | ARQUIVOS AFETADOS | AUTOR
```

**Após deploy estável confirmado:**
1. Mova todas as entradas para `docs/CHANGELOG_HISTORICO.md`
2. Deixe esta seção com apenas `_Nenhuma modificação pendente de deploy._`
3. Faça commit com mensagem: `chore: limpa changelog pós-deploy vX.Y.Z`

---

## 11. TESTES

### O que testar (obrigatório)
- Services: lógica de negócio, casos de borda, erros esperados
- Schemas Zod: entradas válidas e inválidas
- `withTenantSchema`: isolamento de tenant (mock do Prisma)
- Autenticação: token expirado, tenant inválido, role insuficiente

### O que NÃO testar aqui
- Frameworks externos (Fastify, Prisma, Zod) — eles têm seus próprios testes
- Integração com engines externos (Traccar, Fleetbase) — use mocks

### Estrutura de teste
```typescript
// meu-modulo.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MeuModuloService', () => {
  describe('create', () => {
    it('cria item válido com dados corretos', async () => { /* ... */ });
    it('lança erro quando tenant não existe', async () => { /* ... */ });
    it('lança erro quando campos obrigatórios estão ausentes', async () => { /* ... */ });
  });
});
```

Cobertura mínima: **80%** de statements. Rode `npm run test:coverage` antes de PR.

---

## 12. MÓDULOS ATIVOS (CHECKOUT)

| Prefixo | Módulo | Notas |
|---|---|---|
| `/auth` | Auth | JWT + refresh SHA-256 |
| `/finia` | FinIA | WhatsApp/Evolution + IA |
| `/paperclip` | Paperclip | Agentes; schema tenant dedicado |
| `/memory` | Memory | Memória isolada; schema tenant dedicado |
| `/admin` | Admin | Superadmin + CRM/ERP |

Provisionamento de **novos** tenants: `core/tenant/tenant.provisioner.ts` cria auth + finia + paperclip + memory.
Schemas antigos podem ainda ter tabelas históricas — não dropar em produção sem plano.

---

## 13. TEMPO REAL / SOCKETS

Socket.IO foi removido das dependências do núcleo atual (sem módulos TV/driver).
Não reintroduza namespaces `/cast` ou `/driver-chat` sem implementação e revisão de segurança.

---

## 14. O QUE NÃO CRIAR NOVAMENTE

Antes de criar utilitário, verifique se já existe:

| Necessidade | Onde já existe |
|-------------|----------------|
| Validação de env | `config/env.ts` |
| Instância Prisma | `core/database/prisma.ts` |
| Wrapper multi-tenant | `withTenantSchema()` |
| Hash/tokens | `modules/auth/auth.service.ts` |
| Logger | Pino via `request.log` / `app.log` |
| Paperclip tenant DDL | `core/tenant/paperclip-tenant-schema.ts` |
| Memory tenant DDL | `core/tenant/memory-tenant-schema.ts` |
| Provisionamento | `core/tenant/tenant.provisioner.ts` |

---

## 15. REFERÊNCIAS RÁPIDAS

```bash
# Schemas
docker exec -it postgres_dev psql -U postgres -d saas_dev -c "\dn"

# Health
curl http://localhost:3000/health

# Docs
# docs/architecture/estrutura-atual.md
# docs/modules/finia/README.md
# docs/modules/paperclip/integracao.md
```

---

## 16. CONTEXT7 — DOCUMENTAÇÃO ATUALIZADA DE BIBLIOTECAS

O Context7 é um servidor MCP que entrega documentação real e atualizada de qualquer biblioteca diretamente na conversa. Já está configurado em `.mcp.json` e habilitado em `.claude/settings.local.json`.

### 16.1 Quando usar (obrigatório)

Use o Context7 **sempre** que a tarefa envolver qualquer um destes casos:

| Situação | Por que consultar |
|----------|------------------|
| Escrever código novo com uma lib | APIs mudam entre versões — não assuma pela memória |
| Corrigir um erro de TypeScript ou runtime | O erro pode ser de API incorreta ou breaking change |
| Atualizar uma dependência | Verificar o migration guide antes de tocar no código |
| Implementar feature que não foi feita antes | Evitar reinventar o que a própria lib já oferece |
| Resultado inesperado mesmo com código "correto" | Comportamento pode ter mudado na versão instalada |

### 16.2 Como usar

**Passo 1 — Identificar o ID da biblioteca:**
```
resolve-library-id: "fastify"         → /fastify/fastify
resolve-library-id: "prisma"          → /prisma/prisma
resolve-library-id: "next.js"         → /vercel/next.js
resolve-library-id: "zod"             → /colinhacks/zod
resolve-library-id: "react query"     → /tanstack/query
resolve-library-id: "socket.io"       → /socketio/socket.io
resolve-library-id: "expo"            → /expo/expo
resolve-library-id: "zustand"         → /pmndrs/zustand
resolve-library-id: "@fastify/jwt"    → /fastify/jwt
resolve-library-id: "axios"           → /axios/axios
```

**Passo 2 — Buscar a documentação relevante:**
```
get-library-docs: "/fastify/fastify"  topic: "plugins lifecycle"
get-library-docs: "/prisma/prisma"    topic: "transactions"
get-library-docs: "/vercel/next.js"   topic: "app router middleware"
get-library-docs: "/colinhacks/zod"   topic: "object schema parse"
```

### 16.3 Fluxo obrigatório ao encontrar um erro

Quando um erro ocorrer durante implementação, siga esta ordem antes de qualquer tentativa de correção:

```
1. Leia a mensagem de erro completa
      ↓
2. Identifique qual biblioteca está envolvida
      ↓
3. resolve-library-id → encontre o ID correto
      ↓
4. get-library-docs → busque o tópico relacionado ao erro
      ↓
5. Compare o código atual com a documentação oficial
      ↓
6. Corrija com base na documentação — não por tentativa e erro
```

**Nunca pule o passo 3-4.** Tentar corrigir sem consultar a documentação leva a múltiplas tentativas erradas.

### 16.4 Mapeamento rápido: erro → biblioteca → tópico

| Tipo de erro | Biblioteca | Tópico para buscar |
|---|---|---|
| `FastifyError`, route não encontrada, plugin não registrado | `fastify` | `plugins`, `routes`, `hooks` |
| `PrismaClientKnownRequestError`, migration falhou | `prisma` | `error handling`, `migrations`, `transactions` |
| Erro de hidratação, `useEffect` não dispara, rota 404 | `next.js` | `app router`, `server components`, `hydration` |
| `ZodError`, `.parse()` lança erro inesperado | `zod` | `error handling`, `schema types` |
| Token JWT inválido, cookie não lido | `@fastify/jwt` | `options`, `cookie`, `verify` |
| Socket não conecta, evento não dispara | `socket.io` | `namespaces`, `rooms`, `middleware` |
| `useQuery` não atualiza, cache não invalida | `react query` | `query invalidation`, `stale time` |
| Erro de navegação, rota não encontrada no app mobile | `expo` | `expo-router`, `navigation` |
| Estado Zustand não persiste entre telas | `zustand` | `persist middleware`, `selectors` |
| Upload multipart falha, arquivo não lido | `@fastify/multipart` | `options`, `file handling` |

### 16.5 Bibliotecas do projeto e seus IDs Context7

```
# Backend
fastify          → resolve "fastify"
@fastify/jwt     → resolve "@fastify/jwt"
@fastify/cors    → resolve "@fastify/cors"
@fastify/helmet  → resolve "@fastify/helmet"
@fastify/multipart → resolve "@fastify/multipart"
@fastify/rate-limit → resolve "@fastify/rate-limit"
@fastify/static  → resolve "@fastify/static"
@fastify/cookie  → resolve "@fastify/cookie"
prisma           → resolve "prisma"
zod              → resolve "zod"
socket.io        → resolve "socket.io"
bcrypt           → resolve "bcrypt"
node-cron        → resolve "node-cron"

# Frontend
next.js          → resolve "next.js"
react            → resolve "react"
axios            → resolve "axios"
@tanstack/react-query → resolve "react query"
tailwindcss      → resolve "tailwind css"

# Mobile
expo             → resolve "expo"
expo-router      → resolve "expo router"
zustand          → resolve "zustand"
react-native     → resolve "react native"
```

### 16.6 O que o Context7 NÃO resolve

- Erros de lógica de negócio do próprio sistema (esses você analisa no código)
- Erros de configuração de ambiente (`.env`, Docker, portas) — verifique os arquivos de config
- Erros de SQL custom (usa `$executeRawUnsafe`) — analise o SQL diretamente
- Erros de tipagem interna (tipos criados no próprio projeto) — leia os arquivos de tipos

---

*Última atualização deste arquivo: veja `git log -1 CLAUDE.md`*
