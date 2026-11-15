# Coordenação — servidor Paperclip (fork Emmanuel)

**Fork alvo (servidor):** https://github.com/EmmanuelBonifacio/paperclip (`master`)  
**Não** usar o nome `PaperclipSaaS` nem abrir PR em `paperclipai/paperclip`.

Um worker irmão implementa o lado servidor nesse fork. Este diretório no
SaaSPlatformDev guarda o **contrato e referências** para copiar/adaptar.

Base de análise adicional: upstream público `paperclipai/paperclip` (somente leitura).

## Dual mode (cliente SaaS já implementado)

| Modo | Env SaaS | Header ao Paperclip | Uso |
|------|----------|---------------------|-----|
| `local_trusted` | `PAPERCLIP_AUTH_MODE=local_trusted` | nenhum | Dev compose loopback; **proibido em production** |
| `apiKey` | `PAPERCLIP_AUTH_MODE=apiKey` + `PAPERCLIP_API_KEY` | `Bearer pcp_sdk_…` | Alvo com o fork autenticado |

## Conteúdo

| Path | Uso |
|------|-----|
| [APPLY-CHECKLIST.md](./APPLY-CHECKLIST.md) | Contrato + checklist do worker servidor |
| [migrations-crlf-report.md](./migrations-crlf-report.md) | 0466/0467 LF vs CRLF — não editar SQL |
| [scripts/test-setup.mjs](./scripts/test-setup.mjs) | Reset embedded/test Postgres |
| [ENABLE_AUTH.md](./ENABLE_AUTH.md) | UI auth off; API ainda exige SDK key |
| [packages/db/src/schema/agent_sdk_keys.ts](./packages/db/src/schema/agent_sdk_keys.ts) | Schema referência |
| [packages/db/src/migrations/0XXX_agent_sdk_keys.sql](./packages/db/src/migrations/0XXX_agent_sdk_keys.sql) | SQL placeholder (renumerar no fork) |
| [server/src/middleware/agent-sdk-auth.ts](./server/src/middleware/agent-sdk-auth.ts) | Auth referência |
| [server/src/routes/agent-sdk.ts](./server/src/routes/agent-sdk.ts) | Guards de escopo |

Progresso compartilhado: store `docs/paperclip-sdk-progress.md`.
