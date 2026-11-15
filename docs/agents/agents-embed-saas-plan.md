# Plano — Incorporar agentes no monorepo SaaS (SP-7)

> Cópia no repositório SaaS (docs-only). Sem implementação de feature neste PR.

**Status:** plano user-facing — **fase 1 (inventário) concluída**; fases 2+ aguardam aprovação  
**Aprovação de direção:** Emmanuel — *não* depender de API Paperclip externa/separada; privacidade total (permissões, controle e dados dos agentes só no SaaS)  
**Última verificação:** 2026-11-15 (UTC)  
**Inventário fase 1:** [agents-extract-inventory.md](./agents-extract-inventory.md)  
**Repos:** `EmmanuelBonifacio/SaaSPlatformDev`  
**Referência MIT (somente leitura / extração seletiva):** `EmmanuelBonifacio/paperclip` (fork) e upstream `paperclipai/paperclip`  
**Task:** SP-7 — Incorporar agentes no monorepo SaaS

---

## 0. Decisão e anti-objetivos

### Decisão aprovada

O módulo de agentes vive **dentro** do monorepo SaaS:

- Auth = JWT + tenant do SaaS (mesmo fluxo atual).
- Dados de agentes/tarefas/runs = PostgreSQL do SaaS (`withTenantSchema` / provisioner).
- Sem login, sessão, board ou API do produto Paperclip como dependência de produção.
- Sem serviço Paperclip separado obrigatório em compose/prod.

### Anti-objetivos (explícitos)

| Não fazer | Motivo |
|-----------|--------|
| Manter Paperclip como API externa obrigatória | Quebra a privacidade total pedida |
| Copiar o monorepo Paperclip inteiro para dentro do SaaS | UI, auth, CLI, stores e produtos laterais fora de escopo |
| Abrir API de agentes sem JWT SaaS | Contraria auth e isolamento |
| Rodar `local_trusted` em produção | Já bloqueado no contrato SDK atual; reforçar no embed |
| Declarar conformidade legal/LGPD | Fora do escopo deste plano |

---

## 1. Objetivo

Entregar um módulo **`agents`** (evolução/substituição do atual `modules/paperclip`) no backend Fastify e superfícies mínimas no frontend, de forma que:

1. Usuário autenticado no SaaS gerencie agentes, tarefas, comentários e solicitações de execução **sem** conta Paperclip.
2. Todo controle de permissão use RBAC/JWT/tenant já existentes (`tenantMiddleware`, `requireModule`, `requireRole`).
3. Todo dado de tenant passe por `withTenantSchema` (ou DDL do provisioner para schemas `tenant_*`).
4. Segredos de provedores LLM/adapters fiquem no backend SaaS (nunca no browser; nunca em logs).
5. O produto Paperclip externo possa ser **desligado** após a ponte de transição (ver §6).

**V1 funcional (paridade com o contrato SDK já desenhado):**

- Listar agentes
- Listar/criar tarefas
- Criar comentários
- Solicitar execução (run) de agente
- Gates de aprovação preservados como regra de negócio no SaaS (não “auto-approve” silencioso)

---

## 2. O que extrair do Paperclip (MIT) vs o que descartar

Licença confirmada: **MIT** (Copyright Paperclip AI) — uso, cópia e modificação permitidos, com retenção do aviso de copyright nas porções substanciais incorporadas. Ver §7.

### Extrair (conceitos / trechos úteis — reimplementar no estilo SaaS)

| Área Paperclip | Valor para o SaaS | Forma de uso |
|----------------|-------------------|--------------|
| Modelo mental: agente, tarefa (issue), comentário, run, approval gate | Domínio V1 | Tipos + schema Zod + services Fastify |
| Escopos V1 do SDK (`agents:read`, `tasks:read`, `tasks:write`, `comments:write`, `agents:run`) | Least privilege interno | Mapear para RBAC SaaS + capability do agente (não Bearer externo) |
| Invariantes: company/tenant scope, assignee único, checkout atômico, activity log | Segurança operacional | Services + testes de isolamento |
| Adapter registry (padrão “tipo de adapter registrado no servidor”) | Extensão controlada | Registry interno no módulo `agents` (sem plugin marketplace) |
| Contrato de client `createAgentClient` (superfície HTTP) | UX de integração interna | Client **in-process** ou HTTP só para o próprio Fastify — sem host Paperclip |

Fontes já mapeadas no Project: `docs/paperclip-sdk-*.md`, uploads em `internal/paperclip-uploads/` (`AGENTS`, `LICENSE`, `DESIGN` só como referência de domínio — **não** copiar o design system Paperclip).

### Descartar (não incorporar)

| Peça Paperclip | Motivo |
|----------------|--------|
| `ui/` (board React/Vite, DESIGN tokens Paperclip) | Frontend SaaS já é Next.js + shadcn |
| Auth Paperclip / Better Auth / `ENABLE_AUTH` / board API keys / `agent_sdk_keys` | Auth é JWT SaaS |
| CLI `paperclipai`, companies.sh import/export, Skills Store, Teams catalog UI | Produtos laterais |
| Postgres embutido + Drizzle migrations do Paperclip como runtime | SaaS usa Prisma + provisioner `tenant_*` |
| Sandbox cloud providers (E2B, Modal, etc.) como default | Infra nova → exige aprovação à parte |
| Dependência de rede a `paperclip.ing` ou instância Paperclip | Viola privacidade total |

**Regra de extração:** preferir *reimplementar* no padrão de módulo SaaS (`*.routes / *.controller / *.service / *.schema / *.test`) em vez de vendorar o servidor Express do Paperclip.

---

## 3. Arquitetura alvo no SaaS

### 3.1 Pastas (proposta)

```
apps/backend/src/modules/agents/     # substitui gradualmente modules/paperclip
  agents.routes.ts
  agents.controller.ts
  agents.service.ts
  agents.schema.ts
  agents.types.ts
  agents.repository.ts               # SQL/Prisma via withTenantSchema
  agents.runner.ts                   # orquestração de run (V1 mínima)
  agents.permissions.ts              # RBAC + capabilities do agente
  agents.test.ts

apps/backend/src/core/tenant/
  agents-tenant-schema.ts            # DDL provisioner (evolui paperclip-tenant-schema)

apps/frontend/src/modules/agents/    # UI mínima (lista + tarefa + run) — fase posterior à API

packages/agents-sdk/                 # opcional: client tipado apontando para /api/agents
                                     # (não para host Paperclip)
```

Manter `modules/paperclip` só enquanto a ponte externa existir; renomear/migrar na fase de desligamento (§5.5).

### 3.2 Banco de dados

| Onde | O quê |
|------|--------|
| `public` | Feature flag / módulo `agents` no catálogo de módulos do tenant (padrão atual `modules`); **não** dados de tarefa/agente |
| `tenant_<slug>` | Tabelas de domínio: `agents`, `agent_tasks`, `agent_task_comments`, `agent_runs`, `agent_approvals`, `agent_activity`, settings/secrets **referenciados** (valores sensíveis cifrados ou via mecanismo já aprovado) |

**Evolução do schema atual** (`paperclip_settings`, `paperclip_conversations` no provisioner):

- Hoje as conversas SaaS apontam para `issue_id` / `agent_id` **externos** do Paperclip.
- Alvo: IDs nativos UUID no schema do tenant; `company_id` Paperclip deixa de existir (tenant = company).

Migrations Prisma: apenas o que for global em `public`. DDL de tenant = `tenant.provisioner` + script de upgrade documentado para tenants já provisionados (aprovação obrigatória antes de executar).

### 3.3 API Fastify (V1)

Prefixo sugerido: `/api/agents` (ou manter `/api/paperclip` durante transição com alias).

| Método | Rota | Auth | Papel mínimo sugerido |
|--------|------|------|------------------------|
| GET | `/agents` | JWT + tenant + module | `user` |
| GET | `/tasks` | idem | `user` |
| POST | `/tasks` | idem | `user` |
| POST | `/tasks/:id/comments` | idem | `user` |
| POST | `/agents/:id/runs` | idem | `user` (aprovação se gate) |
| GET/POST | `/approvals…` | idem | `admin` para decidir gates sensíveis |

Todas as rotas: `preHandler: [tenantMiddleware, requireModule("agents"|"paperclip")]`; mutações administrativas com `requireRole("admin")` quando aplicável.

Controllers thin → service → repository com `withTenantSchema`. Sem `fetch()` para host Paperclip no caminho feliz.

### 3.4 Permissões RBAC

Camadas (defense in depth):

1. **JWT** — identidade + `tenantId` + `role` (`user` \| `admin` \| `superadmin`).
2. **Módulo** — tenant precisa ter o módulo habilitado (`requireModule`).
3. **Objeto** — service revalida ownership/visibilidade (padrão atual de conversas por `owner_user_id`; admin vê escopo tenant).
4. **Capability do agente** — cada agente declara escopos internos (espelho dos escopos V1 do SDK); runner não executa ação fora da allowlist.
5. **Approval gate** — ações governadas (ex.: run com efeito externo) ficam `pending_approval` até admin/aprovador.

Não introduzir Bearer `pcp_sdk_…` como auth de usuário SaaS.

---

## 4. Dados sensíveis, isolamento e least privilege

### 4.1 Isolamento de tenant

- Leituras/escritas de agentes/tarefas/runs **somente** via `withTenantSchema(tenantId, …)`.
- Tenant derivado do JWT verificado — nunca do body/slug do cliente.
- Testes obrigatórios: cross-tenant deny (404/403 sem vazar existência).

### 4.2 Secrets

- API keys de LLM/providers: só servidor; variáveis de ambiente globais **ou** config por tenant no banco (padrão `fleet_tenant_configs`), nunca no frontend.
- Não reutilizar o modelo `PAPERCLIP_API_KEY` como credencial de produto embutido.
- Rotação e armazenamento: seguir skill `secure-secrets` / checklist antigravity na implementação; plano não inventa vault novo sem aprovação.

### 4.3 Logs e privacidade

- Pino: redact de `password`, `token`, `authorization`, `secret`, conteúdos de prompt se contiverem PII.
- Não logar corpo completo de mensagens de usuário/agente em produção.
- Minimizar campos em SELECT/respostas API.
- Telemetria para terceiros: **proibida** no caminho de agentes sem aprovação explícita.

### 4.4 Least privilege para agentes

- Agente não herda role `admin` do usuário automaticamente.
- Runner opera com identity de serviço + capabilities declaradas.
- Sem acesso a schemas de outros tenants.
- Sem shell/rede irrestrita na V1 (adapters allowlisted).
- Budget/hard-stop: fora da V1 mínima, mas reservar campo/status para não pintar em canto.

---

## 5. Fases de PR (pequenos, sequenciais)

Cada fase = 1 PR focado no SaaS (salvo nota). **Sem merge de infra nova** sem aprovação.

| Fase | PR (escopo) | Entrega observável | Critério para avançar |
|------|-------------|--------------------|------------------------|
| **1 — Inventário** | Doc + matriz extract/discard | [agents-extract-inventory.md](./agents-extract-inventory.md) — **feito** | Emmanuel aprova inventário → libera fase 2 |
| **2 — Schema** | DDL `agents-*` no provisioner + notas de upgrade tenant existente | Tabelas no `tenant_*` sem depender de `company_id` externo | Review + aprovação de migration/DDL |
| **3 — API mínima V1** | Rotas Fastify + services + testes isolamento/RBAC | CRUD/list/run stub com gates; **zero** chamada a host Paperclip | Testes verdes + checklist segurança |
| **4 — Client interno** | `packages/agents-sdk` ou service in-process + frontend mínimo opcional | App SaaS consome `/api/agents` | Smoke local documentado |
| **5 — Desligar dual Paperclip** | Remover `PaperclipApiService` HTTP, envs `PAPERCLIP_*` de prod, compose opcional | Módulo legado `paperclip` deprecated ou alias; docs atualizados | Confirmação de que nenhum fluxo prod chama Paperclip |

**Ordem fixa:** 1 → 2 → 3 → 4 → 5. Não pular schema antes do inventário aprovado.

---

## 6. Relação com PRs SDK atuais

| PR | Repo | Papel sob a nova direção |
|----|------|---------------------------|
| [SaaS #2](https://github.com/EmmanuelBonifacio/SaaSPlatformDev/pull/2) — `cursor/paperclip-agent-sdk-d1ae` | SaaSPlatformDev | **Ponte opcional de transição** (`local_trusted` / `apiKey`) só para validação local enquanto o embed não existe. **Não** é a arquitetura alvo. Pode permanecer aberto como referência de contrato V1 ou ser fechado após inventário. |
| [paperclip #1](https://github.com/EmmanuelBonifacio/paperclip/pull/1) — `cursor/agents-sdk-api-keys-f1e5` | fork paperclip | Útil como **especificação de escopos/authZ** e testes de negação. **Não** mergear como dependência de produção do SaaS. Fork continua referência MIT; sem obrigação de manter servidor Paperclip no deploy. |

### Recomendação (pós-inventário fase 1)

1. **Congelar SaaS #2** — sem novas features; referência de contrato V1 / ponte `local_trusted` local apenas. Não mergear como caminho de produção.
2. **Não** investir em produção com `apiKey` → Paperclip externo; paperclip #1 só como checklist de escopos/testes negativos.
3. Reaproveitar do PR #2: lista de endpoints V1, schemas Zod, testes de contrato — portando para módulo `agents` nativo.
4. Docs `paperclip-sdk-*.md` = histórico de ponte; este plano + inventário = fonte de verdade do embed.
5. Continuar no dual `apiKey` **atrasa** o embed e contradiz privacidade total.

---

## 7. Riscos, licença MIT, o que NÃO fazer sem aprovação

### Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Escopo inchado (copiar UI/adapters cloud Paperclip) | Atraso + superfície de ataque | Fases pequenas; discard list rígida |
| DDL tenant inconsistente em tenants antigos | 500 em produção | Upgrade script + testes; try/catch só onde padrão do repo já exige |
| Runner com privilégio excessivo | Exfiltração cross-tenant / abuso de tools | Capabilities + approval gates + testes negativos |
| Ponte dual esquecida ligada | Dados ainda saem para Paperclip | Fase 5 com checklist de remoção de env/compose |
| Atribuição MIT omitida | Risco legal de copyright | NOTICE/LICENSE.fragment nas porções substanciais |

### Licença MIT

- Permitido incorporar e modificar código MIT do Paperclip.
- Obrigatório: manter aviso de copyright e texto da licença nas cópias/porções substanciais.
- Não implica endorsement; não misturar código com licença incompatível sem revisão.
- Preferência: reimplementação limpa + citação de inspiração reduz acoplamento; se copiar trechos, registrar arquivos de origem no inventário (fase 1).

### NÃO fazer sem aprovação explícita de Emmanuel

- Qualquer migration/DDL em banco real ou script de backfill destrutivo
- Adicionar infraestrutura (fila, worker dedicado, sandbox cloud, vault)
- Novas dependências npm de runtime relevantes
- Deploy / expor agentes na internet
- Remover módulo `paperclip` atual antes da fase 5 aprovada
- Telemetria externa, webhooks para terceiros, ou compartilhar dados de agentes fora do SaaS
- Alterar JWT claims / hierarquia de roles global
- Implementar código das fases 2+ antes da aprovação da fase correspondente

---

## 8. Critérios de aceite observáveis

### Aceite do plano / fase 1

- [x] Documento em `docs/agents-embed-saas-plan.md` cobrindo §§1–8
- [x] Direção “sem API Paperclip externa” explícita
- [x] Relação com PRs #2 (SaaS) e #1 (fork) documentada
- [x] Fase 1 inventário aprovada e entregue — [agents-extract-inventory.md](./agents-extract-inventory.md)
- [ ] Emmanuel aprova inventário e autoriza **fase 2 (schema)** — *pendente*

### Aceite da solução embed (após fases — meta)

| # | Critério observável |
|---|---------------------|
| A1 | Com JWT válido + módulo habilitado, `GET /api/agents` lista agentes **do tenant** sem chamar host Paperclip (evidência: mock/spy de rede zero ou env Paperclip ausente) |
| A2 | Usuário do tenant B não lê/escreve tarefas do tenant A (teste de integração) |
| A3 | Sem JWT → 401; role insuficiente em rota admin → 403 |
| A4 | Criar tarefa + comentário + solicitar run persistem só em `tenant_*` |
| A5 | Segredo de provider não aparece em resposta HTTP nem em log de teste |
| A6 | `NODE_ENV=production` rejeita qualquer modo `local_trusted` residual |
| A7 | Compose/prod documentado **sem** serviço Paperclip obrigatório |
| A8 | NOTICE/MIT presente se houver código substancial derivado |
| A9 | README / changelog do repo atualizados na entrega de código |

---

## 9. Verificação deste plano (checklist interno)

Conferido contra o estado atual do Project e do código:

| Checagem | Resultado |
|----------|-----------|
| Preferências PT + skills (implement-feature, access-control-tenancy, antigravity-security, threat-modeling, privacy-data-protection) | Aplicadas na estrutura do plano |
| `CLAUDE.md` / architecture: `withTenantSchema`, módulo Fastify, JWT | Alinhado |
| Módulo atual `apps/backend/src/modules/paperclip/*` ainda fala HTTP com Paperclip (`paperclip.api.service.ts`) | Confirmado — justifica embed |
| DDL atual `paperclip_settings` / `paperclip_conversations` no provisioner | Confirmado — base da fase 2 |
| RBAC `requireRole` user/admin/superadmin | Confirmado |
| PRs open: SaaS #2, paperclip fork #1 | Confirmados via GitHub 2026-11-15 |
| LICENSE Paperclip MIT | Confirmada (`internal/paperclip-uploads/LICENSE_*` + API GitHub) |
| Handoff SDK (`paperclip-sdk-handoff.md` / progress / brief / local-validation) | Lidos; tratados como ponte, não alvo |
| Código **não** implementado neste turno | Cumprido |

Gaps conscientes (fase 1 fecha):

- Inventário arquivo-a-arquivo do que copiar vs reescrever no fork
- Decisão final: manter ou fechar SaaS #2 durante a transição
- Detalhe de cifragem de secrets por tenant (mecanismo existente vs novo)

---

## 10. Próximo passo

**Fase 1 concluída.** Inventário: [agents-extract-inventory.md](./agents-extract-inventory.md).

**Aguardando decisão:** posso iniciar a **fase 2 — schema** (DDL `agents-*` no provisioner + notas de upgrade de tenants existentes), ainda **sem** API de feature?

Referências rápidas:

- Inventário: [agents-extract-inventory.md](./agents-extract-inventory.md)
- Doc ponte local: [integracao-paperclip.md](../integracao-paperclip.md)
- SaaS PR #2: https://github.com/EmmanuelBonifacio/SaaSPlatformDev/pull/2  
- Fork PR #1: https://github.com/EmmanuelBonifacio/paperclip/pull/1
