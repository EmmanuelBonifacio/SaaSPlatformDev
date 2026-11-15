# Cutover fase 5 — desligar dual Paperclip

**Data:** 2026-11-15  
**Branch:** `cursor/agents-embed-cutover-3b10`

## Breaking changes

| Antes | Depois |
|-------|--------|
| `GET/POST /paperclip/*` (HTTP → Paperclip externo) | **410/removido** — use `/agents` |
| `PAPERCLIP_API_URL` no backend | **Removido** do `env.ts` |
| Dashboard conversas via Paperclip issues | Tarefas privadas + comentários + runs nativos |
| `paperclipApiService` (frontend) | Lança erro; use `agentsApiService` |
| Compose `docker-compose.paperclip.yml` | Deprecated (não obrigatório) |

## O que NÃO muda / preservado

- Tabelas `paperclip_settings` / `paperclip_conversations` nos `tenant_*` (**sem DROP**)
- Id do módulo de catálogo `paperclip` (tenants já habilitados continuam válidos)
- DDL `paperclip_*` ainda pode ser criada pelo provisioner (`IF NOT EXISTS`) — legado inerte
- Código em `modules/paperclip/` permanece no repo marcado `DEPRECATED.md` (não registrado)

## Checklist de deploy

1. Mergear stack na ordem: **#5 (schema) → #6 (API) → #8 (client) → este PR (cutover)**.
2. Backup do Postgres.
3. Em cada ambiente (dev → staging → prod):
   - Aplicar DDL nativo se ainda não aplicado: `npm run db:migrate:agents` (aditivo; **não** é drop).
   - Remover `PAPERCLIP_API_URL` / `.env.paperclip` dos secrets de runtime.
   - **Não** subir `docker-compose.paperclip.yml`.
4. Smoke:
   - Login JWT → `GET /agents` 200 (módulo paperclip ativo).
   - `GET /paperclip/agents` → 404 (rota ausente).
   - Dashboard: listar agentes/tarefas; abrir thread; comentar.
5. Confirmar que nenhum job/script ainda aponta para host Paperclip.

## Rollback

- Reverter o deploy deste PR restaura o registro de `/paperclip` **somente se** a imagem/código anterior ainda tiver a ponte e `PAPERCLIP_API_URL`.
- Dados `paperclip_*` e `agents*` no tenant permanecem; rollback de código não apaga tabelas.

## Histórico da ponte

Docs antigos: `docs/integracao-paperclip.md` (histórico). Runtime canônico: `docs/agents/`.
