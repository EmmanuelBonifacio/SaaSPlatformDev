# @saasplatform/paperclip-agent-sdk

Cliente HTTP V1 para a API de agentes Paperclip, usado pelo backend do SaaS.

## Uso

```ts
import { createAgentClient } from "@saasplatform/paperclip-agent-sdk";

// Produção / alvo autenticado
const client = createAgentClient({
  baseUrl: "https://paperclip.internal",
  apiKey: process.env.PAPERCLIP_API_KEY!,
  authMode: "apiKey",
});

// Dev local em rede restrita (loopback) — sem Bearer
const local = createAgentClient({
  baseUrl: "http://127.0.0.1:3100",
  authMode: "local_trusted",
});
```

## Métodos V1

| Método | Endpoint Paperclip |
|--------|--------------------|
| `listAgents(companyId)` | `GET /api/companies/:id/agents` |
| `getAgent(agentId)` | `GET /api/agents/:id` |
| `listTasks(companyId)` | `GET /api/companies/:id/issues` |
| `createTask(companyId, input)` | `POST /api/companies/:id/issues` |
| `listComments(taskId)` | `GET /api/issues/:id/comments` |
| `createComment(taskId, input)` | `POST /api/issues/:id/comments` |
| `runAgent(agentId, input?)` | `POST /api/agents/:id/wakeup` |

A autenticação do usuário do painel permanece no SaaS (JWT + tenant). Este
pacote só autentica a chamada máquina-a-máquina ao Paperclip.
