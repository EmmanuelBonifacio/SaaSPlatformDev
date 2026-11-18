/**
 * Persistência criptografada de tokens OAuth MCP (SP-40).
 * Respostas públicas nunca incluem plaintext.
 */

import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import {
  decryptSecret,
  encryptSecret,
  tokenPresence,
} from "./agents.oauth-crypto";
import { writeActivity } from "./agents.repository.shared";
import type { ConnectorOauthTokenMeta } from "./agents.types";

type TokenRow = {
  connectorId: string;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  tokenType: string;
  scope: string | null;
  expiresAt: Date | null;
  lastRefreshedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredOauthTokens = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string | null;
  expiresAt: string | null;
  lastRefreshedAt: string | null;
};

export type UpsertOauthTokensInput = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: Date | null;
};

function mapMeta(row: TokenRow): ConnectorOauthTokenMeta {
  return {
    hasAccessToken: tokenPresence(row.accessTokenEnc),
    hasRefreshToken: tokenPresence(row.refreshTokenEnc),
    tokenType: row.tokenType || "Bearer",
    scope: row.scope,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastRefreshedAt: row.lastRefreshedAt?.toISOString() ?? null,
  };
}

export async function getOauthTokenMeta(
  schemaName: string,
  connectorId: string,
): Promise<ConnectorOauthTokenMeta | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<TokenRow[]>`
      SELECT connector_id AS "connectorId",
        access_token_enc AS "accessTokenEnc",
        refresh_token_enc AS "refreshTokenEnc",
        token_type AS "tokenType",
        scope,
        expires_at AS "expiresAt",
        last_refreshed_at AS "lastRefreshedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM agent_connector_oauth_tokens
      WHERE connector_id = ${connectorId}::uuid
      LIMIT 1
    `,
  );
  return rows[0] ? mapMeta(rows[0]) : null;
}

export async function listOauthTokenMetaByConnectorIds(
  schemaName: string,
  connectorIds: string[],
): Promise<Map<string, ConnectorOauthTokenMeta>> {
  const result = new Map<string, ConnectorOauthTokenMeta>();
  if (connectorIds.length === 0) return result;
  const idList = Prisma.join(
    connectorIds.map((id) => Prisma.sql`${id}::uuid`),
  );
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<TokenRow[]>`
      SELECT connector_id AS "connectorId",
        access_token_enc AS "accessTokenEnc",
        refresh_token_enc AS "refreshTokenEnc",
        token_type AS "tokenType",
        scope,
        expires_at AS "expiresAt",
        last_refreshed_at AS "lastRefreshedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM agent_connector_oauth_tokens
      WHERE connector_id IN (${idList})
    `,
  );
  for (const row of rows) {
    result.set(row.connectorId, mapMeta(row));
  }
  return result;
}

/** Uso interno do servidor apenas — nunca expor via HTTP. */
export async function loadDecryptedOauthTokens(
  schemaName: string,
  connectorId: string,
): Promise<StoredOauthTokens | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<TokenRow[]>`
      SELECT connector_id AS "connectorId",
        access_token_enc AS "accessTokenEnc",
        refresh_token_enc AS "refreshTokenEnc",
        token_type AS "tokenType",
        scope,
        expires_at AS "expiresAt",
        last_refreshed_at AS "lastRefreshedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM agent_connector_oauth_tokens
      WHERE connector_id = ${connectorId}::uuid
      LIMIT 1
    `,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    accessToken: decryptSecret(row.accessTokenEnc),
    refreshToken: row.refreshTokenEnc
      ? decryptSecret(row.refreshTokenEnc)
      : null,
    tokenType: row.tokenType || "Bearer",
    scope: row.scope,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastRefreshedAt: row.lastRefreshedAt?.toISOString() ?? null,
  };
}

export async function upsertOauthTokens(
  schemaName: string,
  userId: string,
  connectorId: string,
  input: UpsertOauthTokensInput,
): Promise<ConnectorOauthTokenMeta> {
  const accessEnc = encryptSecret(input.accessToken);
  const refreshEnc =
    input.refreshToken && input.refreshToken.length > 0
      ? encryptSecret(input.refreshToken)
      : null;
  const tokenType = (input.tokenType?.trim() || "Bearer").slice(0, 64);
  const scope = input.scope?.trim().slice(0, 2000) || null;

  return withTenantSchema(schemaName, async (tx) => {
    const exists = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM agent_connectors
      WHERE id = ${connectorId}::uuid AND kind = 'mcp'
      LIMIT 1
    `;
    if (!exists[0]) {
      throw new AgentsModuleError(404, "Connector MCP não encontrado.");
    }

    const rows = await tx.$queryRaw<TokenRow[]>`
      INSERT INTO agent_connector_oauth_tokens (
        connector_id, access_token_enc, refresh_token_enc,
        token_type, scope, expires_at, last_refreshed_at
      ) VALUES (
        ${connectorId}::uuid,
        ${accessEnc},
        ${refreshEnc},
        ${tokenType},
        ${scope},
        ${input.expiresAt ?? null},
        NOW()
      )
      ON CONFLICT (connector_id) DO UPDATE SET
        access_token_enc = EXCLUDED.access_token_enc,
        refresh_token_enc = COALESCE(
          EXCLUDED.refresh_token_enc,
          agent_connector_oauth_tokens.refresh_token_enc
        ),
        token_type = EXCLUDED.token_type,
        scope = COALESCE(EXCLUDED.scope, agent_connector_oauth_tokens.scope),
        expires_at = EXCLUDED.expires_at,
        last_refreshed_at = NOW(),
        updated_at = NOW()
      RETURNING connector_id AS "connectorId",
        access_token_enc AS "accessTokenEnc",
        refresh_token_enc AS "refreshTokenEnc",
        token_type AS "tokenType",
        scope,
        expires_at AS "expiresAt",
        last_refreshed_at AS "lastRefreshedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "connector_oauth_tokens_stored",
      entityType: "connector",
      entityId: connectorId,
    });
    return mapMeta(rows[0]);
  });
}

export async function deleteOauthTokens(
  schemaName: string,
  connectorId: string,
): Promise<void> {
  await withTenantSchema(schemaName, (tx) =>
    tx.$executeRaw`
      DELETE FROM agent_connector_oauth_tokens
      WHERE connector_id = ${connectorId}::uuid
    `,
  );
}
