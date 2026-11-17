# SP-26 — Port UI Paperclip (board sob `/[slug]/agents`)

**Auth:** JWT SaaS + `requireModule("agents")` — sem Better Auth / login Paperclip.  
**Constraint:** não DROP `paperclip_*`.

## O que este PR entrega

Board operator com sidebar esquerda (New Task, Search, Dashboard, Inbox, Chat, Work, Agents, Company), densidade Paperclip (status chips, rows), mobile bottom nav, e superfícies wired à API nativa `/agents`.

## Paridade vs Paperclip

| Área | Status |
|------|--------|
| Shell / sidebar / mobile nav | Próximo (estrutura + labels Paperclip) |
| Dashboard / Agents / Tasks / Approvals / Runs / Activity / Settings | Funcional via API V1, visual alinhado |
| Inbox / Chat / Search | Funcional com dados V1 (approvals+tasks; private threads; filtro local) |
| Projects / Routines / Goals / Artifacts / Skills / Connectors / Org / Costs | Nav + stub honesto |
| IssueDetail rico, Skills Studio, MCP, Org chart, Costs accounting, live runs | Ainda diferem / ausentes |
| Auth Paperclip | Excluído de propósito |

## Smoke test

1. Login em `/{slug}/login` (SaaS).
2. Abrir `/{slug}/agents` — board full-bleed com sidebar.
3. New Task → cria e abre detalhe.
4. Percorrer Inbox, Chat, Search, Tasks, Agents, Approvals, Runs, Activity.
5. Confirmar ausência de rotas login/register Paperclip.
