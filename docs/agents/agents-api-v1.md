# API agentes V1 nativa (SP-7 fase 3)

Prefixo: `/agents`  
Auth: JWT + `tenantMiddleware` + `requireModule("agents")`  
Dados: somente `tenant_*` via `withTenantSchema` — **sem** HTTP Paperclip.

| Método | Rota | Papel |
|--------|------|-------|
| GET | `/agents` | user |
| POST | `/agents` | admin |
| GET | `/agents/:agentId` | user (inclui `instructions`, `harness`) |
| PATCH | `/agents/:agentId` | admin (identity/harness/permissions) |
| GET/POST | `/agents/:agentId/secrets` | user / admin — `envRef` só (sem valor) |
| DELETE | `/agents/:agentId/secrets/:secretId` | admin |
| GET/PUT | `/agents/:agentId/tools` | user / admin |
| GET/PATCH | `/agents/:agentId/budgets` | user / admin |
| GET | `/agents/tasks` | user (filtra private) |
| POST | `/agents/tasks` | user |
| GET | `/agents/tasks/:taskId` | user (owner/admin se private) |
| PATCH | `/agents/tasks/:taskId` | owner ou admin |
| GET/POST | `/agents/tasks/:taskId/comments` | user com visão da tarefa |
| POST | `/agents/:agentId/runs` | user; cria `queued`; se sem approval → runner (claim/adapter/heartbeat) |
| GET | `/agents/approvals` | admin |
| POST | `/agents/approvals/:id/decide` | admin; approve enfileira runner |
| GET | `/agents/live` | user; running/queued counts + active agents (heartbeats) |
| GET | `/agents/runs` | user (filtros `agentId` / `taskId`) |
| GET | `/agents/runs/:runId` | user (inclui `adapterType`, `heartbeatAt`, `summary`) |
| GET | `/agents/activity` | user (filtros `agentId` / `entityType`+`entityId`) |
| GET/POST | `/agents/skills` | user / admin |
| GET/PATCH | `/agents/skills/:skillId` | user / admin |
| GET/POST | `/agents/skills/:skillId/attachments` | user / admin |
| DELETE | `/agents/skills/:skillId/attachments/:agentId` | admin |
| GET/POST | `/agents/skills/:skillId/versions` | user / admin (publish) |
| POST | `/agents/skills/:skillId/versions/:versionId/restore` | admin |
| GET/POST | `/agents/connectors` | user / admin |
| GET | `/agents/connectors/gateways` | user (MCP only) |
| GET/PATCH | `/agents/connectors/:connectorId` | user / admin |
| POST | `/agents/connectors/:id/oauth/start|complete|disconnect` | admin |
| GET | `/agents/artifacts?taskId=` | user | Filter artifacts/plans for IssueDetail |
| GET | `/agents/org` | user | Org tree + flat agents (`reportsToAgentId`) |
| GET | `/agents/costs` | user | Budget/spend rollup per agent |
| GET/POST/PATCH | `/agents/projects` | user / admin |
| GET/POST/PATCH | `/agents/routines` | user / admin |
| GET/POST/PATCH | `/agents/goals` | user / admin |
| GET/POST/PATCH | `/agents/artifacts` | user (create/update any authenticated) |

Connectors: `secretRef` é **nome de variável de ambiente** (regex `^[A-Z][A-Z0-9_]*$`) — nunca o valor do segredo.

Runner (SP-35): adapters `stub`, `http_webhook`, `claude` (Anthropic HTTP), `codex`/`openai` (OpenAI HTTP), `cursor` (CLI allowlisted). Secrets só via `agent_secret_refs.env_ref` → `process.env`. Hard budget bloqueia novos runs; spend estimado grava em `agent_budgets.spent_cents`. Tipos sem harness (ex.: `gemini`) **falham fechado** — sem fallback silencioso para stub. Cursor CLI ausente → fail-closed com `CursorCliUnavailable`. Recovery periódico falha runs `running` sem heartbeat (>10 min) e re-enfileira `queued` sem approval pendente.

Ponte `/paperclip` removida. Catálogo: `agents`. Client: [agents-client.md](./agents-client.md). Cutover: [agents-cutover.md](./agents-cutover.md). Limpeza: [agents-cleanup.md](./agents-cleanup.md). Port UI: [paperclip-ui-port.md](./paperclip-ui-port.md).

AgentDetail (SP-30): `instructions` + `harness` no agent; tabelas `agent_secret_refs` / `agent_tools` / `agent_budgets`. Secrets são **somente nomes de env**.

Requer DDL fase 2 (+ extras SP-27/SP-29/SP-30) aplicada no tenant (`npm run db:migrate:agents` em ambiente aprovado).
