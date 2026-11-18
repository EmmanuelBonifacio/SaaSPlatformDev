# Upgrade de schema — agentes nativos (SP-7 fase 2)

**Escopo:** DDL aditivo em `tenant_*` para o embed de agentes.  
**Não executa** migrate em produção neste documento — apenas o procedimento.

## O que é criado

Em cada schema `tenant_<slug>` (idempotente, `IF NOT EXISTS`):

| Tabela | Função |
|--------|--------|
| `agents` | Cadastro de agentes (UUID nativo) |
| `agent_tasks` | Tarefas |
| `agent_task_comments` | Comentários (+ idempotência `client_request_id`) |
| `agent_task_comment_attachments` | Anexos/imagens/receipts de comments (SP-44) |
| `agent_runs` | Solicitações/execução (+ colunas de spend/tokens SP-39) |
| `agent_approvals` | Gates de aprovação |
| `agent_activity` | Auditoria de mutações |
| `agent_budgets` | Soft/hard limits por agente |
| `agent_spend_events` | Ledger idempotente de spend por run (SP-39) |
| `agent_connector_oauth_tokens` | Tokens OAuth MCP criptografados (SP-40) |
| `agent_cases` | Cases operacionais (SP-41) |
| `agent_workspaces` | Workspaces de execução/compartilhados (SP-41) |
| `agent_routines` (+ assignee/last_fired) | Dispatcher cron SP-42 |

**Não há `company_id` Paperclip.** Isolamento = schema do tenant + `withTenantSchema`.

## O que NÃO é feito (neste script aditivo)

- **Não** dropa `paperclip_*` automaticamente (ver [agents-cleanup.md](./agents-cleanup.md) — opt-in)
- **Não** migra/backfill mensagens ou issues do Paperclip externo
- **Não** cria rotas API de feature (fase 3+)

## Tenants novos

O `tenant.provisioner` inclui `buildAgentsTenantSchemaSQL` + memory (sem DDL paperclip).

## Tenants já provisionados

1. Backup do Postgres (obrigatório antes de qualquer ambiente compartilhado).
2. Confirmar branch/commit com o DDL.
3. Em **dev/staging** aprovado:

   ```sh
   cd apps/backend
   npm run db:migrate:agents
   ```

4. Validar em um tenant de teste:

   ```sql
   SET search_path TO tenant_<slug>;
   \dt agent*
   -- esperado: agents, agent_tasks, agent_task_comments,
   --           agent_runs, agent_approvals, agent_activity
   -- paperclip_* continua existindo se já existia
   ```

5. Produção: só após aprovação explícita, janela de mudança e backup restaurável. O script é aditivo; ainda assim trate como mudança de schema controlada.

## Rollback

Não há `DROP` automático neste upgrade aditivo. DROP de `paperclip_*` é só via script opt-in documentado em [agents-cleanup.md](./agents-cleanup.md).

## Catálogo de módulos

O catálogo usa o módulo `agents`. Tenants legados com `paperclip` devem rodar o rename (seed ou `db:rename:module-agents`) — ver [agents-cleanup.md](./agents-cleanup.md).
