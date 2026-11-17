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

## PR4 — AgentDetail completo (SP-30)

- Tabs: Overview / Identity / Harness / Secrets (env refs) / Tools / Budgets / Audit
- Create wizard: Identity → Harness → Permissions
- DDL: `instructions`, `harness`, `agent_secret_refs`, `agent_tools`, `agent_budgets`
- Limite: adapters externos ainda executam via stub/webhook do runner

## Paridade vs Paperclip

| Área | Status |
|------|--------|
| Shell / sidebar / mobile nav | Próximo |
| IssueDetail | Parcial→rico (V1); plans/artifacts ainda honest stubs |
| AgentDetail | Multi-tab + wizard (harness/secrets refs/tools/budgets) |
| Skills | Catálogo + attach (sem Skill Studio) |
| Connectors | List/config (sem OAuth MCP / Apps browse completo) |
| Runner / live dashboard | Parcial (stub/webhook + heartbeats) |
| Org / Costs / Artifacts produto | Stub / fora |
| Auth Paperclip | Excluído |

## Migração DDL aditiva

Tenants existentes: `npm run db:migrate:agents` (aprovado). Provisioner novo já inclui extras.
