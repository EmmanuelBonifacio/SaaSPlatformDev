# Client interno — agentes (SP-7 fase 4)

## Peças

| Consumidor | Client | Transporte |
|------------|--------|------------|
| Outros módulos backend | `createAgentsInternalClient` em `modules/agents/agents.client.ts` | **In-process** → `agentsService` / `withTenantSchema` |
| Scripts / integrações Node | `@saasplatform/agents-sdk` → `createAgentsClient` | HTTP local + **JWT SaaS** (`Authorization: Bearer`) para `/agents` |
| Frontend | `apps/frontend/src/services/agents.service.ts` | Axios (`services/api.ts`) → `/agents` |

Nenhum client usa Paperclip HTTP / `pcp_sdk_`. A ponte `/paperclip` foi **desligada** na fase 5.

## Exemplo in-process (backend)

```ts
import { createAgentsInternalClient } from "./modules/agents/agents.client";

const agents = createAgentsInternalClient({
  schemaName: request.tenant.schemaName,
  userId: request.user.sub,
  role: request.user.role,
});
await agents.listTasks(25, 0);
```

## Exemplo HTTP SDK

```ts
import { createAgentsClient } from "@saasplatform/agents-sdk";

const client = createAgentsClient({
  baseUrl: "http://127.0.0.1:3000",
  getAccessToken: () => accessJwt,
});
await client.listAgents({ limit: 25 });
```

## UI

O dashboard usa só `/agents` (tarefas + comentários + runs). Ver [agents-cutover.md](./agents-cutover.md).
