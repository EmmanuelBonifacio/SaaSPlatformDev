/**
 * Referência — autenticação de chaves SDK para o fork EmmanuelBonifacio/paperclip.
 *
 * Encaixe no actorMiddleware existente DEPOIS de board keys / ANTES de agent JWT
 * genérico, ou como caminho dedicado para rotas /api/sdk/*.
 *
 * Regras:
 * - ENABLE_AUTH=false NÃO dispensa esta autenticação.
 * - local_trusted implícito do board NÃO deve satisfazer rotas SDK em modo apiKey.
 * - Chave → company_id fixa; requests a outra company → 403.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const AGENT_SDK_KEY_PREFIX = "pcp_sdk_";

export type AgentSdkScope =
  | "agents:read"
  | "tasks:read"
  | "tasks:write"
  | "comments:write"
  | "agents:run";

export function hashAgentSdkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function looksLikeAgentSdkKey(token: string): boolean {
  return token.startsWith(AGENT_SDK_KEY_PREFIX);
}

export function hasScope(
  granted: readonly AgentSdkScope[] | undefined,
  required: AgentSdkScope,
): boolean {
  return Boolean(granted?.includes(required));
}

/**
 * Pseudocódigo de resolução (implementar com drizzle do fork):
 *
 * 1. Extrair Bearer
 * 2. Se !looksLikeAgentSdkKey → continuar cadeia board/agent
 * 3. SELECT * FROM agent_sdk_keys WHERE key_hash = hash AND revoked_at IS NULL
 * 4. Se expires_at <= now → 401
 * 5. req.actor = { type: "sdk", companyId, keyId, scopes, source: "agent_sdk_key" }
 * 6. touch last_used_at (debounce)
 */
export const AGENT_SDK_AUTH_NOTES = {
  enableAuthFalse: "UI login/registro off; API SDK ainda exige Bearer pcp_sdk_*",
  neverOpenApi: true,
} as const;
