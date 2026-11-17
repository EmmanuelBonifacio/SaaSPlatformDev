# API agentes V1 nativa (SP-7 fase 3)

Prefixo: `/agents`  
Auth: JWT + `tenantMiddleware` + `requireModule("agents")`  
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
| GET | `/agents/runs` | user (filtros `agentId` / `taskId`) |
| GET | `/agents/runs/:runId` | user |
| GET | `/agents/activity` | user (filtros `agentId` / `entityType`+`entityId`) |
| GET/POST | `/agents/skills` | user / admin |
| GET/PATCH | `/agents/skills/:skillId` | user / admin |
| GET/POST | `/agents/skills/:skillId/attachments` | user / admin |
| DELETE | `/agents/skills/:skillId/attachments/:agentId` | admin |
| GET/POST | `/agents/connectors` | user / admin |
| GET/PATCH | `/agents/connectors/:connectorId` | user / admin |

Connectors: `secretRef` é **nome de variável de ambiente** (regex `^[A-Z][A-Z0-9_]*$`) — nunca o valor do segredo.

Ponte `/paperclip` removida. Catálogo: `agents`. Client: [agents-client.md](./agents-client.md). Cutover: [agents-cutover.md](./agents-cutover.md). Limpeza: [agents-cleanup.md](./agents-cleanup.md). Port UI: [paperclip-ui-port.md](./paperclip-ui-port.md).

Requer DDL fase 2 (+ extras SP-27) aplicada no tenant (`npm run db:migrate:agents` em ambiente aprovado).
