# Port UI Paperclip sob `/[slug]/agents`

**Auth:** JWT SaaS + `requireModule("agents")` — sem Better Auth / login Paperclip.  
**Constraint:** não DROP `paperclip_*`.

## PR1 — Board shell (merged #20)

Sidebar Work/Company, mobile bottom nav, Dashboard/Inbox/Chat/Search + superfícies V1.

## PR2 — IssueDetail + Skills/Connectors (merged #21)

- **IssueDetail:** thread de comentários, status chips, assignment, runs/activity da task; Plans/Artifacts como seções honestas sem API.
- **Skills:** CRUD tenant (`agent_skills` / attachments) + UI de catálogo/anexo.
- **Connectors:** CRUD tenant (`agent_connectors`) com `secret_ref` (nome de env) — sem secrets no source/payload.

## PR3 — Runner + live dashboard (SP-29)

- **Runner:** `createRun` / approve → claim `queued`→`running` → adapter (`stub` | `http_webhook`) → heartbeats → `succeeded`/`failed`.
- **DDL:** `agent_runs.adapter_type|summary|heartbeat_at`, `agents.last_heartbeat_at` (ALTER IF NOT EXISTS).
- **API:** `GET /agents/live`; runs expõem heartbeat/summary.
- **UI:** Dashboard Live strip (poll 3s), badge Runs, Run detail polling enquanto live.
- **Limite honesto:** Claude/Codex/Cursor harnesses externos ainda não — caem no stub com nota.

## Paridade vs Paperclip

| Área | Status |
|------|--------|
| Shell / sidebar / mobile nav | Próximo |
| IssueDetail | Parcial→rico (V1); plans/artifacts ainda honest stubs |
| Skills | Catálogo + attach (sem Skill Studio) |
| Connectors | List/config (sem OAuth MCP / Apps browse completo) |
| Runner / live dashboard | Parcial (stub/webhook + heartbeats; sem harness externos) |
| Org / Costs / Artifacts produto | Stub / fora |
| Auth Paperclip | Excluído |

## Migração DDL aditiva

Tenants existentes: `npm run db:migrate:agents` (aprovado). Provisioner novo já inclui extras.
