# Limpeza residual SP-7 — pós-cutover

**Branch:** `cursor/agents-embed-cleanup-3b10`  
**Pré-requisito:** stack #5 → #6 → #8 → #9 (cutover) mergeada ou esta PR stacked em #9.

## O que este PR faz

| Item | Ação |
|------|------|
| `modules/paperclip/` (backend) | **Removido** |
| Catálogo `paperclip` → `agents` | Seed + `requireModule("agents")` + UI |
| Rota UI `/:slug/paperclip` | Redirect → `/:slug/agents` |
| DDL `paperclip_*` no provisioner | **Não cria mais** |
| Compose / `.env.paperclip` | Removidos do repo |
| DROP `paperclip_*` | Script **opt-in** (não automático) |

## Migração de tenants existentes (catálogo)

Antes ou junto do deploy deste código:

```bash
# dry-run
cd apps/backend && npm run db:rename:module-agents

# aplicar (com backup)
CONFIRM_RENAME_MODULE_AGENTS=yes npm run db:rename:module-agents -- --apply
```

Ou rode `npm run db:seed` (também renomeia/reatribui `paperclip` → `agents` de forma segura).

Sem isso, `requireModule("agents")` retorna 403 para tenants que ainda só têm o módulo `paperclip` no catálogo.

## DROP opt-in de `paperclip_*` (nunca automático em prod)

```bash
# dry-run — lista SQL por tenant
cd apps/backend && npm run db:drop:paperclip

# aplicar somente com backup + aprovação
CONFIRM_DROP_PAPERCLIP=yes npm run db:drop:paperclip -- --apply
```

- Usa `DROP TABLE IF EXISTS … CASCADE`
- **Não** faz parte do boot nem do provisioner
- Faça `pg_dump` do schema/tenant antes

## Checklist de deploy

1. Backup Postgres.
2. Merge stack: **#5 → #6 → #8 → #9 → este PR**.
3. `CONFIRM_RENAME_MODULE_AGENTS=yes npm run db:rename:module-agents -- --apply` (ou seed).
4. Smoke: JWT + módulo `agents` → `GET /agents` 200; UI `/:slug/agents`.
5. (Opcional, depois) `CONFIRM_DROP_PAPERCLIP=yes … --apply` se não precisar mais dos dados legados.

## Sem migrate destrutivo automático

Nenhum script de DROP ou rename roda no boot, no CI ou no `deploy.sh` sem flags explícitas.
