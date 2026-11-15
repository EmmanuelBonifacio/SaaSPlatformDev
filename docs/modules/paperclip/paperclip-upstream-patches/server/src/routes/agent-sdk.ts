/**
 * Referência — superfície mínima de integração para o SaaS.
 *
 * Opção A (preferida): reutilizar rotas /api/companies|agents|issues existentes
 * com actor source=agent_sdk_key e guards de escopo/company.
 *
 * Opção B: montar /api/sdk/v1/* espelhando os paths do createAgentClient.
 *
 * O cliente SaaS hoje chama os paths canônicos /api/... (Opção A).
 */

export const AGENT_SDK_ROUTE_GUARDS = [
  { method: "GET", path: "/api/companies", scope: "agents:read" },
  { method: "POST", path: "/api/companies", scope: "tasks:write" },
  { method: "GET", path: "/api/companies/:companyId/agents", scope: "agents:read" },
  { method: "GET", path: "/api/agents/:id", scope: "agents:read" },
  { method: "GET", path: "/api/companies/:companyId/issues", scope: "tasks:read" },
  { method: "POST", path: "/api/companies/:companyId/issues", scope: "tasks:write" },
  { method: "GET", path: "/api/issues/:id", scope: "tasks:read" },
  { method: "PATCH", path: "/api/issues/:id", scope: "tasks:write" },
  { method: "GET", path: "/api/issues/:id/comments", scope: "tasks:read" },
  { method: "POST", path: "/api/issues/:id/comments", scope: "comments:write" },
  { method: "POST", path: "/api/agents/:id/wakeup", scope: "agents:run" },
] as const;

/**
 * ENABLE_AUTH=false:
 * - Esconder /login /register na UI (SERVE_UI já pode ser false no compose SaaS)
 * - Middleware de sessão Better Auth pode ficar ocioso
 * - Qualquer /api/* de integração SEM Bearer SDK válido → 401
 * - Nunca cair para actor local_implicit em rotas SDK quando a instância
 *   estiver configurada para exigir apiKey de integração
 */
