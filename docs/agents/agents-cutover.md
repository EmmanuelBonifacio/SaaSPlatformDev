# Cutover fase 5 — desligar dual Paperclip

**Data:** 2026-11-15  
**Branch cutover:** `cursor/agents-embed-cutover-3b10` (PR #9)  
**Limpeza residual:** [agents-cleanup.md](./agents-cleanup.md)

## Breaking changes (fase 5)

| Antes | Depois |
|-------|--------|
| `GET/POST /paperclip/*` | Removido |
| `PAPERCLIP_API_URL` | Removido |
| Dashboard conversas Paperclip | Tarefas + comentários + runs nativos |

## Limpeza residual (pós-#9)

| Antes | Depois |
|-------|--------|
| Catálogo `paperclip` | `agents` (+ script/seed de rename) |
| `modules/paperclip/` | Removido |
| UI `/:slug/paperclip` | Redirect → `/:slug/agents` |
| DDL cria `paperclip_*` | Parou; DROP só via script opt-in |

## Checklist de deploy

1. Merge: **#5 → #6 → #8 → #9 → cleanup**.
2. Backup Postgres.
3. Rename catálogo: `CONFIRM_RENAME_MODULE_AGENTS=yes npm run db:rename:module-agents -- --apply` (ou seed).
4. Smoke `GET /agents` com módulo `agents`.
5. (Opcional) DROP legado: ver [agents-cleanup.md](./agents-cleanup.md).

## Rollback

- Reverter código restaura comportamento da imagem anterior.
- Rename/DROP aplicados no banco **não** revertem sozinhos — use backup.
