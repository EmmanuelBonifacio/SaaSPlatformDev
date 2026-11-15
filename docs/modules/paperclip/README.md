# Módulo Paperclip (Agentes de IA)

O painel SaaS expõe agentes, tarefas e conversas via rotas autenticadas do
próprio backend. O navegador **nunca** fala com o Paperclip nem recebe
credenciais dele.

**Servidor Paperclip do projeto:**
[EmmanuelBonifacio/paperclip](https://github.com/EmmanuelBonifacio/paperclip)
(branch `master`). Upstream `paperclipai/paperclip` só como referência.

## Arquitetura

```
Browser (JWT SaaS)
    → Fastify /api/paperclip/*  (tenant + módulo + ownership)
        → @saasplatform/paperclip-agent-sdk  (createAgentClient)
            → EmmanuelBonifacio/paperclip /api/...
```

| Camada | Responsabilidade |
|--------|------------------|
| Frontend | UI; só chama API SaaS |
| Rotas/service SaaS | JWT, tenant, módulo, propriedade de conversa |
| `paperclip-agent-sdk` | Cliente HTTP V1 |
| Fork Paperclip | Agentes, issues, comentários, wakeup + `agent_sdk_keys` |

## Dual mode

| `PAPERCLIP_AUTH_MODE` | Header | Uso |
|----------------------|--------|-----|
| `local_trusted` | — | Dev compose em `127.0.0.1` / rede Docker privada. **Rejeitado em production.** |
| `apiKey` | `Authorization: Bearer <PAPERCLIP_API_KEY>` | Alvo com o fork; chave só no env do backend |

```bash
# Dev (compose atual)
PAPERCLIP_API_URL=http://127.0.0.1:3100
PAPERCLIP_AUTH_MODE=local_trusted

# Alvo / produção
PAPERCLIP_AUTH_MODE=apiKey
PAPERCLIP_API_KEY=pcp_sdk_...
```

## Pacote cliente

[`packages/paperclip-agent-sdk`](../../../packages/paperclip-agent-sdk)

```ts
import { createAgentClient } from "@saasplatform/paperclip-agent-sdk";

const client = createAgentClient({
  baseUrl: "http://127.0.0.1:3100",
  apiKey: process.env.PAPERCLIP_API_KEY,
  authMode: "apiKey",
});
```

Métodos V1: list/get agents, list/create/get/update tasks, comments, `runAgent`.

## Coordenação com o worker servidor

Contrato, checklist, `test:setup`, CRLF/LF e referências de schema/middleware:

- [paperclip-upstream-patches/](./paperclip-upstream-patches/)
- Store: `docs/paperclip-sdk-progress.md`

Guia compose: [integracao-paperclip.md](../../integracao-paperclip.md).
