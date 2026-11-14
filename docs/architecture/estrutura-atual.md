# Estrutura atual — SaaSPlatformDev

**Atualizado:** 2026-11-14  
Documento vivo alinhado ao checkout. Não descreve módulos históricos ausentes.

---

## Apps

| App | Caminho | Papel |
|---|---|---|
| Backend | `apps/backend/` | Fastify 5 + Prisma 6 + PostgreSQL (schema-per-tenant) |
| Frontend | `apps/frontend/` | Next.js 15 App Router — painel tenant + admin + landing |
| Laravel Brain | `apps/laravel-brain/` | Integração ERPNext/Frappe (em evolução). Rodar `composer install` localmente — `vendor/` não é versionado |

## Módulos backend (rotas)

| Prefixo | Módulo |
|---|---|
| `/auth` | Autenticação JWT + refresh |
| `/finia` | Assistente financeiro + Evolution API |
| `/paperclip` | Agentes / tarefas / conversas |
| `/memory` | Memória isolada por tenant/usuário |
| `/admin` | Superadmin (tenants, planos, CRM/ERP) |

## Frontend (rotas tenant)

`/[slug]/login`, `/dashboard`, `/finia`, `/paperclip`, `/memoria`, `/configuracoes`  
Admin: `/admin/*` · Landing: `/`

## Multi-tenancy

- Schema `public`: tenants, modules, planos, admin_users, CRM/ERP
- Schema `tenant_<slug>`: users, refresh_tokens, tabelas FinIA/Paperclip/Memory
- Acesso a dados de tenant **somente** via `withTenantSchema()`
- Provisionamento de **novos** tenants: `tenant.provisioner.ts` (auth + finia + paperclip + memory)

## Infra Docker

**Dev (`docker-compose.yml`):** postgres (:5433), pgAdmin (:5050), redis (:6379), evolution-api (:8080)  
**Prod (`docker-compose.prod.yml`):** postgres, backend, frontend, nginx, certbot  
**Paperclip:** `docker-compose.paperclip.yml`

| Serviço app | Porta |
|---|---|
| Backend | 3000 |
| Frontend | 3001 |

## Scripts

| Script | Uso |
|---|---|
| `scripts/deploy.sh` | Deploy VPS |
| `scripts/security-scan.sh` | Varredura pré-deploy |
| `scripts/backup-db.sh` | Backup |
| `scripts/init-ssl.sh` / `renew-ssl.sh` | Let's Encrypt |
| `scripts/setup.sh` | Setup inicial |

## Documentação

| Pasta | Conteúdo |
|---|---|
| `docs/architecture/` | Estrutura, relatório técnico, memória agentes |
| `docs/modules/` | FinIA, Paperclip |
| `docs/ops/` | Deploy Hostinger |
| `.agents/` | Rules + skills (incl. `repo-structure`) |

## Segurança (invariantes)

- JWT validado no servidor; refresh como SHA-256
- Sem confiar em tenant/role vindos do cliente
- TLS com validação de certificado
- Sem segredos no código
