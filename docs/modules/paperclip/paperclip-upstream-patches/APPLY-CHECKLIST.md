# Checklist — servidor Paperclip (fork Emmanuel)

**Repo alvo:** https://github.com/EmmanuelBonifacio/paperclip (`master`)  
**Não** abrir PR em `paperclipai/paperclip`.  
Worker irmão implementa o lado servidor; este checklist é o contrato com o cliente SaaS.

## Contrato com o SaaS (`createAgentClient`)

O backend SaaS envia:

```http
Authorization: Bearer <PAPERCLIP_API_KEY>
Accept: application/json
Content-Type: application/json
```

Endpoints V1 usados:

| Cliente SDK | Método | Path |
|-------------|--------|------|
| `listCompanies` | GET | `/api/companies` |
| `createCompany` | POST | `/api/companies` |
| `listAgents` | GET | `/api/companies/:companyId/agents` |
| `getAgent` | GET | `/api/agents/:id` |
| `listTasks` | GET | `/api/companies/:companyId/issues` |
| `createTask` | POST | `/api/companies/:companyId/issues` |
| `getTask` / `updateTask` | GET/PATCH | `/api/issues/:id` |
| `listComments` / `createComment` | GET/POST | `/api/issues/:id/comments` |
| `runAgent` | POST | `/api/agents/:id/wakeup` |

## Itens servidor

- [ ] Tabela `agent_sdk_keys`: `id`, `company_id`, `name`, `key_hash` (SHA-256), `scopes` (text[]/jsonb), `expires_at`, `revoked_at`, `last_used_at`, `created_at`
- [ ] Prefixo de chave em claro sugerido: `pcp_sdk_` (só o hash no banco)
- [ ] Middleware: Bearer → lookup hash → company + scopes; revogada/expirada → 401
- [ ] Cross-company / escopo insuficiente → 403 (sem vazar existência)
- [ ] Rotas de integração restritas aos escopos V1 (não reutilizar board admin keys amplas)
- [ ] `ENABLE_AUTH=false`: desliga UI login/registro; **API continua exigindo** apiKey SDK (nunca aberta)
- [ ] Gates de aprovação de agentes preservados
- [ ] Testes: chave ausente/expirada/revogada, escopo, outra empresa, gates
- [ ] `pnpm test:setup` + migrations em LF (ver `migrations-crlf-report.md`)
- [ ] **Não** editar SQL de `0466`/`0467` para forçar pass

## Dual mode no SaaS (já no cliente)

| `PAPERCLIP_AUTH_MODE` | Comportamento do client |
|----------------------|-------------------------|
| `local_trusted` | Sem `Authorization` — só rede restrita/loopback; **bloqueado em `NODE_ENV=production`** |
| `apiKey` | Bearer obrigatório (`PAPERCLIP_API_KEY`) — alvo deste fork |

Atualize este checklist no store `docs/paperclip-sdk-progress.md` quando um item fechar.
