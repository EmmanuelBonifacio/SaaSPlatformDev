# Inventário fase 1 — Extrair / Reimplementar / Descartar (SP-7)

> Cópia no repositório SaaS (docs-only). Sem DDL e sem código de feature.

**Status:** concluído (somente inventário — sem DDL, sem feature de API)  
**Data:** 2026-11-15 (UTC)  
**Plano pai:** [agents-embed-saas-plan.md](./agents-embed-saas-plan.md)  
**Fontes:** checkout local `SaaSPlatformDev` (`main`); fork `EmmanuelBonifacio/paperclip` @ `3244780` (`master`); PR branch `f0fba545` (SDK keys) só como referência de escopos  
**Licença Paperclip:** MIT (Copyright Paperclip AI) — reter NOTICE se copiar trechos substanciais

Legenda da matriz:

| Decisão | Significado |
|---------|-------------|
| **Extrair** | Conceito/contrato a trazer (tipos, regras, nomes de campos) — preferir reescrever no estilo SaaS |
| **Reimplementar** | Precisa existir no SaaS, mas **não** vendorar o código Express/Drizzle/UI |
| **Descartar** | Fora do embed V1 / viola privacidade ou escopo |

---

## 1. Mapa do módulo atual no SaaS (`modules/paperclip`)

### 1.1 Backend

Prefixo Fastify: `/paperclip` (`server.ts`). Auth: `tenantMiddleware` + `requireModule("paperclip")`.

| Arquivo | Papel | Dependência externa? | Destino no embed |
|---------|-------|----------------------|------------------|
| `paperclip.routes.ts` | Rotas GET/POST agentes, tasks, conversas, mensagens | Não | Renomear → `agents.routes.ts` |
| `paperclip.controller.ts` | Handlers thin + Zod parse | Não | Manter padrão |
| `paperclip.service.ts` | Orquestra tenant + API Paperclip | **Sim** (`paperclipApiService`) | Reescrever sem HTTP externo |
| `paperclip.api.service.ts` | `fetch` → `PAPERCLIP_API_URL/api/...` | **Sim (núcleo da ponte)** | **Eliminar** na fase 5 |
| `paperclip.repository.ts` | `withTenantSchema` em `paperclip_settings` / `paperclip_conversations` | Não (SQL local) | Evoluir para tabelas nativas |
| `paperclip.presentation.ts` | Filtro de tasks privadas / por owner | Não | Reimplementar como policy de visibilidade |
| `paperclip.schema.ts` | Zod: conversa, mensagem, paginação | Não | Manter/adaptar |
| `paperclip.types.ts` | Schemas Zod de Agent/Issue/Comment | Não (espelha API Paperclip) | Virar tipos nativos SaaS |
| `paperclip.errors.ts` | Erros de módulo / 502 | Parcial | Manter |
| `paperclip.service.test.ts` | Testes schema/presentation | Não | Expandir com isolamento |

### 1.2 DDL tenant atual

`apps/backend/src/core/tenant/paperclip-tenant-schema.ts` (via provisioner):

| Tabela | Campos-chave | Problema para embed |
|--------|--------------|---------------------|
| `paperclip_settings` | `company_id` TEXT | Amarras a empresa Paperclip externa |
| `paperclip_conversations` | `agent_id`, `issue_id` TEXT, `owner_user_id`, `client_request_id`, `state` | IDs externos; mensagens/tarefas **não** ficam no SaaS |

### 1.3 Frontend / ops

| Peça | Caminho | Nota |
|------|---------|------|
| Dashboard | `apps/frontend/src/modules/paperclip/components/PaperclipDashboard.tsx` | Consome só API SaaS `/paperclip/*` |
| Client Axios | `apps/frontend/src/services/paperclip.service.ts` | OK manter padrão; trocar prefixo depois |
| Página | `apps/frontend/src/app/[slug]/paperclip/page.tsx` | Rota de módulo |
| Módulo admin | toggle `paperclip` em TenantForm/Modal | Renomear display → “Agentes” na fase 4/5 |
| Compose separado | `docker-compose.paperclip.yml` + `.env.paperclip` | **Descartar da topologia alvo** (fase 5) |
| Doc integração | `docs/integracao-paperclip.md` | Histórico de ponte; contradiz privacidade total alvo |
| Env | `PAPERCLIP_API_URL` em `config/env.ts` | Remover após embed |

### 1.4 Fluxo atual (fronteira de confiança)

```
Browser (JWT SaaS)
  → Fastify /paperclip/*  (tenant + module)
    → paperclip_conversations / settings  [tenant_*]
    → HTTP Paperclip API (local_trusted / futuro apiKey)  ← DADOS SAEM DO SaaS
         → DB Paperclip separado (companies, agents, issues, comments, runs)
```

**Ameaça (light):** qualquer exposição da porta Paperclip ou chave SDK vaza dados de agentes/tarefas fora do schema do tenant SaaS. Alvo do embed: cortar essa seta HTTP.

### 1.5 Controles já bons a preservar

- JWT + tenant derivado do token (não do body)
- `requireModule("paperclip")`
- Ownership de conversa por `owner_user_id`
- Prefixo `__SAAS_CHAT_PRIVATE__:` para esconder chats na listagem de tasks
- Idempotência `client_request_id`
- Validação Zod com limites de tamanho/paginação
- Frontend nunca vê `PAPERCLIP_API_URL`

---

## 2. Superfície Paperclip (fork) — escala

| Área | Ordem de magnitude | Implicação |
|------|--------------------|------------|
| `packages/db/src/schema/` | ~189 tabelas | **Não** copiar schema inteiro |
| `server/src/routes/` | ~115 arquivos | Só espelhar superfície V1 mínima |
| `server/src/services/` | ~1350 arquivos | Não vendorar; extrair ideias |
| `ui/` | app board completo | Descartar |
| `cli/`, catalogs, plugins MCP demo | produtos laterais | Descartar V1 |

Company Paperclip ≈ tenant SaaS. No embed, `companyId` **some**; isolamento = `tenant_<slug>` + `withTenantSchema`.

---

## 3. Matriz por conceito / arquivo Paperclip

### 3.1 Domínio V1 (obrigatório no SaaS)

| Conceito Paperclip | Onde (fork) | Decisão | Como no SaaS |
|--------------------|-------------|---------|--------------|
| Agent | `packages/db/src/schema/agents.ts`, `server/src/routes/agents.ts`, `packages/shared/.../agent.ts` | **Reimplementar** | Tabela `agents` em `tenant_*`: id, name, role, title, status, adapter_type, capabilities/permissions (JSON mínimo), timestamps |
| Task / Issue | `schema/issues.ts`, `routes/issues.ts` | **Reimplementar** (subset) | `agent_tasks`: id, title, description, status, priority, assignee_agent_id, created_by_user_id, visibility; **sem** árvore/privacy roots/monitor/workspace na V1 |
| Comment | `schema/issue_comments.ts` | **Reimplementar** (subset) | `agent_task_comments`: body, author_type, author_user_id/agent_id, client_request_id |
| Run / wakeup | `heartbeat_runs.ts`, `agent_wakeup_requests.ts`, rotas checkout/wakeup | **Reimplementar** (stub V1) | `agent_runs`: status queued/running/succeeded/failed; solicitação de run sem harness completo |
| Approval gate | `approvals.ts`, `issue_approvals.ts`, `routes/approvals.ts` | **Reimplementar** (mínimo) | `agent_approvals` pending/approved/rejected; admin decide |
| Activity log | `activity_log.ts`, `routes/activity.ts` | **Reimplementar** (mínimo) | `agent_activity` para mutações (sem PII em details) |
| Idempotência create | `issue_create_idempotency_keys.ts`, `client_request_id` em comments | **Extrair** regra | Manter padrão já usado no SaaS |
| Single assignee + status machine | invariantes `AGENTS.md` | **Extrair** | Enforcer no service |
| Escopos V1 SDK | PR #1: `agents:read`, `tasks:read`, `tasks:write`, `comments:write`, `agents:run` | **Extrair** como capabilities internas | Mapear a RBAC + permissions do agente — **não** Bearer `pcp_sdk_` |
| Adapter registry pattern | `server/src/adapters/registry.ts` | **Extrair** ideia | Allowlist de adapters no módulo SaaS (V1: stub/`process` local controlado) |
| Log redaction | `server/src/log-redaction.ts`, `redaction.ts` | **Extrair** ideias | Alinhar ao Pino redact existente |

Campos Paperclip a **não** trazer na V1 do agent/task: lifecycle plugin holds, harness digests, execution workspaces, privacy tree, billing codes, origin fingerprints, monitor wake, assignee adapter overrides complexos.

### 3.2 Auth / multi-tenant Paperclip → SaaS

| Peça | Decisão | Motivo |
|------|--------|--------|
| Better Auth / `routes/auth.ts` / board sessions | **Descartar** | Auth = JWT SaaS |
| `board_api_keys`, `agent_api_keys` | **Descartar** | Não são o modelo SaaS |
| `agent_sdk_keys` (PR #1) | **Descartar** no runtime SaaS | Útil só como spec de escopos; API key externa some no embed |
| `ENABLE_AUTH=false` + `local_trusted` | **Descartar** no alvo | Ponte transitória apenas |
| `companies` + `company_memberships` | **Descartar** como entidades | Tenant SaaS substitui |
| Company-scoped queries | **Extrair** princípio | Virar tenant-scoped via `withTenantSchema` |

### 3.3 Pacotes e apps Paperclip

| Path | Decisão | Nota |
|------|--------|------|
| `packages/db` (Drizzle + ~189 schemas + migrations) | **Descartar** runtime | Não embutir Drizzle paralelo; Prisma/provisioner SaaS |
| `packages/shared` validators agent/issue/approval | **Extrair** seletivo | Inspirar Zod SaaS; não importar pacote |
| `packages/adapters` / `adapter-utils` | **Descartar** V1 (exceto tipagem mínima) | Aprovação futura se precisar Claude/Cursor/etc. |
| `packages/plugins`, `mcp-server`, demos MCP | **Descartar** | |
| `packages/skills-catalog`, `teams-catalog` | **Descartar** | |
| `packages/paperclip-runner` / eval kernel | **Descartar** V1 | Runner stub próprio |
| `server/` Express app | **Descartar** processo | Lógica reimplementada em Fastify |
| `ui/` + `DESIGN.md` | **Descartar** | Next.js/shadcn do SaaS |
| `cli/` | **Descartar** | |
| `docker/`, Dockerfile Paperclip | **Descartar** da topologia SaaS | |
| `doc/PRODUCT.md`, `AGENTS.md` invariantes | **Extrair** leitura | Controle de domínio |
| `LICENSE` | **Extrair** | NOTICE se copiar código |

### 3.4 Rotas Paperclip vs superfície SaaS V1

| Capacidade | Rotas Paperclip (exemplos) | SaaS V1 |
|------------|----------------------------|---------|
| List/create agents | `routes/agents.ts` | GET/POST `/api/agents` (create pode ser admin-only) |
| List/create tasks | `routes/issues.ts` | GET/POST `/api/agents/tasks` |
| Comments | issues comments | POST `/tasks/:id/comments` |
| Request run | checkout/wakeup / heartbeat | POST `/agents/:id/runs` (stub) |
| Approvals | `routes/approvals.ts` | GET/POST approvals (admin) |
| Chat Slack/Telegram/Discord/Voice | várias `chat-*`, `voice-*` | **Descartar** |
| Secrets manager UI/API | `routes/secrets.ts` + company_secrets* | **Descartar** cópia; secrets via env/config SaaS aprovada |
| Plugins, MCP apps, cloud sandbox | `plugins`, `mcp-*`, `cloud`, environments | **Descartar** V1 |
| Budgets/costs accounting | `costs`, budget_* | **Descartar** V1 (reservar campo status depois) |
| Org chart, routines, pipelines, cases | várias | **Descartar** |

### 3.5 Segredos e dados sensíveis (privacy)

| Dado | Origem hoje | Alvo embed | Controle |
|------|-------------|------------|----------|
| Mensagens / descriptions | Paperclip DB externo | `tenant_*` only | Minimizar SELECT; não logar body |
| Agent adapterConfig (pode ter keys) | Paperclip | Servidor SaaS | Nunca retornar ao browser; redact logs |
| `PAPERCLIP_*` env / signing secret | Compose Paperclip | Remover | — |
| `ANTHROPIC_API_KEY` (já no SaaS) | Backend env | Reuso eventual pelo runner | Já no servidor; não expor |
| company_id marker `saas-tenant:…` | settings + Paperclip | Remover | Tenant id JWT |

---

## 4. Schema V1 sugerido (só inventário — **não implementar**)

Proposta para a fase 2 (aprovação separada), tudo em `tenant_<slug>`:

| Tabela | Propósito | Origem conceitual |
|--------|-----------|-------------------|
| `agents` | Cadastro de agentes | subset `agents` |
| `agent_tasks` | Tarefas | subset `issues` |
| `agent_task_comments` | Comentários | subset `issue_comments` |
| `agent_runs` | Execuções | subset `heartbeat_runs` |
| `agent_approvals` | Gates | subset `approvals` |
| `agent_activity` | Auditoria mutações | subset `activity_log` |
| `agent_settings` | Feature flags do módulo no tenant | substitui `paperclip_settings` **sem** company_id |

Migração de dados: conversas atuais apontam para `issue_id` externo — **sem backfill automático** de mensagens Paperclip na fase 2; documentar que histórico externo fica órfão ao desligar a ponte (fase 5), salvo export manual aprovado.

---

## 5. Relação com PRs SDK (decisão do inventário)

| PR | Recomendação fase 1 |
|----|---------------------|
| [SaaS #2](https://github.com/EmmanuelBonifacio/SaaSPlatformDev/pull/2) | **Congelar** (sem novas features). Manter aberto só como referência de contrato V1 / ponte `local_trusted` local. Não mergear como caminho de produção. |
| [paperclip #1](https://github.com/EmmanuelBonifacio/paperclip/pull/1) | **Não** mergear para produção SaaS. Reusar lista de escopos e casos de teste negativos como checklist do módulo nativo. |

Investir mais no dual `apiKey` **atrasa** o embed e contradiz privacidade total.

---

## 6. Threat model light + skills

### Atores

- Usuário tenant (`user` / `admin`)
- Superadmin plataforma
- Agente (identity de serviço com capabilities)
- Atacante com JWT roubado / IDOR
- Operador com acesso ao host (compose Paperclip legado)

### Ameaças prioritárias → controle no embed

| Ameaça | Controle |
|-------|----------|
| Cross-tenant read/write | `withTenantSchema` + testes A/B |
| IDOR de task/conversa | Ownership + admin scope no service |
| Privilege escalation via agente | Capabilities ≠ role admin; approval gates |
| Exfiltração por API Paperclip residual | Fase 5 remove HTTP/env/compose |
| Segredo em log/resposta | Redact Pino; select mínimo; nunca devolver adapter secrets |
| Abuse de run (DoS/custo) | Rate limit existente + stub run V1 sem sandbox cloud |

### Privacy

- Finalidade: operar agentes do tenant dentro do SaaS
- Destinatários externos: **nenhum** no alvo
- Retenção/export/delete em massa: fora desta fase; exigir aprovação
- Não declarar LGPD/conformidade neste inventário

### Access-control

- Preservar `tenantMiddleware` + `requireModule` + `requireRole` onde admin
- Não confiar em `agentId`/`taskId` do cliente sem revalidar no tenant
- Capabilities do agente allowlisted (espelho dos 5 escopos V1)

---

## 7. Critérios de aceite da fase 1

- [x] Matriz extract / reimplementar / descartar publicada
- [x] Mapa do `modules/paperclip` + DDL + frontend/ops
- [x] Escala Paperclip documentada (não copiar 189 tabelas)
- [x] Schema V1 proposto **como inventário** (sem DDL aplicada)
- [x] Recomendação sobre PRs #2 / #1
- [x] Threat/privacy/access notes
- [ ] Emmanuel aprova inventário e autoriza **fase 2 (schema)** — pendente

---

## 8. Próximo passo

Pergunta: **pode iniciar a fase 2 (schema DDL no provisioner + notas de upgrade de tenants existentes), ainda sem API de feature?**

Não iniciar fase 2 sem novo ok.
