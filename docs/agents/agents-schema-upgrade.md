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
| `agent_runs` | Solicitações/execução |
| `agent_approvals` | Gates de aprovação |
| `agent_activity` | Auditoria de mutações |

**Não há `company_id` Paperclip.** Isolamento = schema do tenant + `withTenantSchema`.

## O que NÃO é feito

- **Não** dropa `paperclip_settings` / `paperclip_conversations`
- **Não** migra/backfill mensagens ou issues do Paperclip externo
- **Não** remove o módulo de catálogo `paperclip` (nome permanece até fase 4/5)
- **Não** cria rotas API de feature (fase 3)

## Tenants novos

O `tenant.provisioner` já inclui `buildAgentsTenantSchemaSQL` junto com paperclip (legado) e memory.

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

Não há `DROP` automático. Rollback de emergência (só com aprovação) seria remover tabelas vazias novas — **nunca** dropar `paperclip_*` nem dados de negócio sem plano separado.

## Catálogo de módulos

O seed mantém o módulo `paperclip` (“Agentes de IA”) para não quebrar tenants/UI atuais. A descrição menciona o schema nativo. Renomear para `agents` fica para fase posterior.
