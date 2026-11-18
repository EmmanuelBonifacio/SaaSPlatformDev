/**
 * Refresh OAuth MCP: manual (tokens no body) ou grant refresh_token no token URL.
 * Tokens nunca são retornados nem logados.
 */

import { AgentsModuleError } from "./agents.errors";
import {
  loadDecryptedOauthTokens,
  upsertOauthTokens,
} from "./agents.repository.oauth-tokens";
import type { OauthRefreshDto } from "./agents.schema";
import type { ConnectorRecord } from "./agents.types";

function resolveTokenUrl(connector: ConnectorRecord): string | null {
  const direct = connector.config.tokenUrl?.trim();
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  const base =
    connector.config.gatewayUrl?.trim() || connector.config.host?.trim();
  if (!base || !/^https?:\/\//i.test(base)) return null;
  const path = connector.config.tokenPath || "/oauth/token";
  try {
    return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
  } catch {
    return null;
  }
}

function resolveExpiresAt(input: {
  expiresAt?: string;
  expiresIn?: number;
}): Date | null {
  if (input.expiresAt) return new Date(input.expiresAt);
  if (input.expiresIn) {
    return new Date(Date.now() + input.expiresIn * 1000);
  }
  return null;
}

async function exchangeRefreshToken(input: {
  tokenUrl: string;
  refreshToken: string;
  clientId: string | null;
  clientSecret: string | null;
}): Promise<{
  accessToken: string;
  refreshToken: string | null;
  tokenType?: string;
  scope?: string | null;
  expiresIn?: number;
}> {
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", input.refreshToken);
  if (input.clientId) body.set("client_id", input.clientId);
  if (input.clientSecret) body.set("client_secret", input.clientSecret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(input.tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: body.toString(),
      signal: controller.signal,
      redirect: "error",
    });
    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new AgentsModuleError(
        502,
        `Token endpoint HTTP ${response.status}.`,
      );
    }
    const accessToken =
      typeof json.access_token === "string" ? json.access_token : null;
    if (!accessToken) {
      throw new AgentsModuleError(502, "Token endpoint sem access_token.");
    }
    return {
      accessToken,
      refreshToken:
        typeof json.refresh_token === "string" ? json.refresh_token : null,
      tokenType:
        typeof json.token_type === "string" ? json.token_type : undefined,
      scope: typeof json.scope === "string" ? json.scope : null,
      expiresIn:
        typeof json.expires_in === "number" ? json.expires_in : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshConnectorOauthTokens(
  schemaName: string,
  userId: string,
  connector: ConnectorRecord,
  input: OauthRefreshDto,
) {
  if (connector.kind !== "mcp") {
    throw new AgentsModuleError(
      400,
      "Refresh OAuth disponível apenas para connectors MCP.",
    );
  }

  if (input.accessToken) {
    return upsertOauthTokens(schemaName, userId, connector.id, {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenType: input.tokenType,
      scope: input.scope,
      expiresAt: resolveExpiresAt(input),
    });
  }

  const stored = await loadDecryptedOauthTokens(schemaName, connector.id);
  if (!stored?.refreshToken) {
    throw new AgentsModuleError(
      400,
      "Sem refresh token armazenado. Envie accessToken no body ou complete OAuth com tokens.",
    );
  }

  const tokenUrl = resolveTokenUrl(connector);
  if (!tokenUrl) {
    throw new AgentsModuleError(
      400,
      "Configure tokenUrl/gatewayUrl+tokenPath no connector para refresh automático.",
    );
  }

  const clientId = connector.oauthClientIdRef
    ? process.env[connector.oauthClientIdRef]?.trim() || null
    : null;
  const clientSecret = connector.oauthClientSecretRef
    ? process.env[connector.oauthClientSecretRef]?.trim() || null
    : null;

  const exchanged = await exchangeRefreshToken({
    tokenUrl,
    refreshToken: stored.refreshToken,
    clientId,
    clientSecret,
  });

  return upsertOauthTokens(schemaName, userId, connector.id, {
    accessToken: exchanged.accessToken,
    refreshToken: exchanged.refreshToken,
    tokenType: exchanged.tokenType,
    scope: exchanged.scope,
    expiresAt: resolveExpiresAt({
      expiresIn: exchanged.expiresIn,
      expiresAt: undefined,
    }),
  });
}
