# API agentes V1 nativa (SP-7 fase 3)

Prefixo: `/agents`  
Auth: JWT + `tenantMiddleware` + `requireModule("paperclip")`  
Dados: somente `tenant_*` via `withTenantSchema` — **sem** HTTP Paperclip.

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/agents` | user |
| POST | `/agents` | admin |
| GET | `/agents/:agentId` | user |
| PATCH | `/agents/:agentId` | admin |
| GET | `/agents/tasks` | user (filtra private) |
| POST | `/agents/tasks` | user |
| GET | `/agents/tasks/:taskId` | user (owner/admin se private) |
| PATCH | `/agents/tasks/:taskId` | owner ou admin |
| GET/POST | `/agents/tasks/:taskId/comments` | user com visão da tarefa |
| POST | `/agents/:agentId/runs` | user; cria `queued`; approval se `requireRunApproval` |
| GET | `/agents/approvals` | admin |
| POST | `/agents/approvals/:id/decide` | admin |

Ponte `/paperclip` **desligada** (fase 5). Client: [agents-client.md](./agents-client.md). Cutover: [agents-cutover.md](./agents-cutover.md).

Requer DDL fase 2 aplicada no tenant (`npm run db:migrate:agents` em ambiente aprovado).
