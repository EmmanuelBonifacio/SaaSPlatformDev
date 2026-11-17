# Port UI Paperclip sob `/[slug]/agents`

**Auth:** JWT SaaS + `requireModule("agents")` — sem Better Auth / login Paperclip.  
**Constraint:** não DROP `paperclip_*`.

## PR1 — Board shell (merged #20)

Sidebar Work/Company, mobile bottom nav, Dashboard/Inbox/Chat/Search + superfícies V1.

## PR2 — IssueDetail + Skills/Connectors (merged #21)

- **IssueDetail:** thread de comentários, status chips, assignment, runs/activity da task; Plans/Artifacts como seções honestas sem API.
- **Skills:** CRUD tenant (`agent_skills` / attachments) + UI de catálogo/anexo.
- **Connectors:** CRUD tenant (`agent_connectors`) com `secret_ref` (nome de env) — sem secrets no source/payload.

## PR3 — Runner + live dashboard (SP-29) — merged #22

- **Runner:** `createRun` / approve → claim → adapter → heartbeats → finish.
- **API/UI:** `GET /agents/live` + Dashboard Live strip.

## PR4 — AgentDetail completo (SP-30) — merged #23

- Tabs: Overview / Identity / Harness / Secrets / Tools / Budgets / Audit
- Create wizard Identity → Harness → Permissions

## PR5 — Skill Studio + MCP (SP-31)

- Skill Studio: `/skills/studio` + versions publish/restore
- MCP gateways list + OAuth start/complete/disconnect (client env refs only; no tokens)
- DDL: `agent_skill_versions`, connector oauth_* columns

## PR — Harness real (SP-35)

- Adapters: `claude` / `codex` (HTTP + env refs), `cursor` (CLI fail-closed), `stub` / `http_webhook`
- Budgets: hard-limit gate + spend no finish
- Limites honestos: sem Gemini nativo; Cursor depende de CLI no host; sem billing Paperclip

## Paridade vs Paperclip

| Área | Status |
|------|--------|
| Shell / sidebar / mobile nav | Próximo |
| IssueDetail | Parcial→rico (V1); plans/artifacts ainda honest stubs |
| AgentDetail | Multi-tab + wizard |
| Skills | Catálogo + Studio versions |
| Connectors / MCP | CRUD + gateway OAuth status (BYO, sem token store) |
| Runner / live dashboard | Real (harness SP-35 + Socket.IO live SP-36; poll só fallback) |
| Org / Costs / Work graph | Org/Costs/Work wired (PRs #25–#27); Cases/Workspaces deferred |
| Auth Paperclip | Excluído |

## Migração DDL aditiva

Tenants existentes: `npm run db:migrate:agents` (aprovado). Provisioner novo já inclui extras.
