import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type {
  CreateConnectorDto,
  OauthCompleteDto,
  UpdateConnectorDto,
} from "./agents.schema";
import type {
  ConnectorOauthStatus,
  ConnectorRecord,
} from "./agents.types";

type ConnectorRow = Omit<
  ConnectorRecord,
  "createdAt" | "updatedAt" | "config"
> & {
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const CONNECTOR_COLS = Prisma.sql`
  id, name, kind, status, config, secret_ref AS "secretRef",
  oauth_status AS "oauthStatus",
  oauth_client_id_ref AS "oauthClientIdRef",
  oauth_client_secret_ref AS "oauthClientSecretRef",
  created_by_user_id AS "createdByUserId",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

function mapConnector(row: ConnectorRow): ConnectorRecord {
  const config =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as ConnectorRecord["config"])
      : {};
  return {
    ...row,
    config,
    oauthStatus: (row.oauthStatus || "disconnected") as ConnectorOauthStatus,
    oauthClientIdRef: row.oauthClientIdRef ?? null,
    oauthClientSecretRef: row.oauthClientSecretRef ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listConnectors(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<ConnectorRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ConnectorRow[]>`
      SELECT ${CONNECTOR_COLS} FROM agent_connectors
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapConnector);
}

export async function getConnector(
  schemaName: string,
  connectorId: string,
): Promise<ConnectorRecord | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ConnectorRow[]>`
      SELECT ${CONNECTOR_COLS} FROM agent_connectors
      WHERE id = ${connectorId}::uuid LIMIT 1
    `,
  );
  return rows[0] ? mapConnector(rows[0]) : null;
}

export async function createConnector(
  schemaName: string,
  userId: string,
  input: CreateConnectorDto,
): Promise<ConnectorRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<ConnectorRow[]>`
      INSERT INTO agent_connectors (
        name, kind, status, config, secret_ref,
        oauth_client_id_ref, oauth_client_secret_ref, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.kind}, ${input.status ?? "disabled"},
        ${JSON.stringify(input.config ?? {})}::jsonb,
        ${input.secretRef ?? null},
        ${input.oauthClientIdRef ?? null},
        ${input.oauthClientSecretRef ?? null},
        ${userId}
      )
      RETURNING ${CONNECTOR_COLS}
    `;
    const connector = mapConnector(rows[0]);
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "connector_created",
      entityType: "connector",
      entityId: connector.id,
    });
    return connector;
  });
}

export async function updateConnector(
  schemaName: string,
  userId: string,
  connectorId: string,
  input: UpdateConnectorDto,
): Promise<ConnectorRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<ConnectorRow[]>`
      SELECT ${CONNECTOR_COLS} FROM agent_connectors
      WHERE id = ${connectorId}::uuid LIMIT 1
    `;
    if (!current[0]) {
      throw new AgentsModuleError(404, "Connector não encontrado.");
    }
    const mapped = mapConnector(current[0]);
    const next = {
      name: input.name ?? mapped.name,
      kind: input.kind ?? mapped.kind,
      status: input.status ?? mapped.status,
      config: input.config ?? mapped.config,
      secretRef:
        input.secretRef !== undefined ? input.secretRef : mapped.secretRef,
      oauthClientIdRef:
        input.oauthClientIdRef !== undefined
          ? input.oauthClientIdRef
          : mapped.oauthClientIdRef,
      oauthClientSecretRef:
        input.oauthClientSecretRef !== undefined
          ? input.oauthClientSecretRef
          : mapped.oauthClientSecretRef,
    };
    const rows = await tx.$queryRaw<ConnectorRow[]>`
      UPDATE agent_connectors SET
        name = ${next.name},
        kind = ${next.kind},
        status = ${next.status},
        config = ${JSON.stringify(next.config)}::jsonb,
        secret_ref = ${next.secretRef},
        oauth_client_id_ref = ${next.oauthClientIdRef},
        oauth_client_secret_ref = ${next.oauthClientSecretRef},
        updated_at = NOW()
      WHERE id = ${connectorId}::uuid
      RETURNING ${CONNECTOR_COLS}
    `;
    const connector = mapConnector(rows[0]);
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "connector_updated",
      entityType: "connector",
      entityId: connector.id,
    });
    return connector;
  });
}

export async function startConnectorOauth(
  schemaName: string,
  userId: string,
  connectorId: string,
): Promise<{ connector: ConnectorRecord; authorizeUrl: string | null }> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<ConnectorRow[]>`
      SELECT ${CONNECTOR_COLS} FROM agent_connectors
      WHERE id = ${connectorId}::uuid LIMIT 1
    `;
    if (!current[0]) {
      throw new AgentsModuleError(404, "Connector não encontrado.");
    }
    const mapped = mapConnector(current[0]);
    if (mapped.kind !== "mcp") {
      throw new AgentsModuleError(
        400,
        "OAuth/gateway disponível apenas para connectors MCP.",
      );
    }
    const rows = await tx.$queryRaw<ConnectorRow[]>`
      UPDATE agent_connectors SET
        oauth_status = 'pending',
        updated_at = NOW()
      WHERE id = ${connectorId}::uuid
      RETURNING ${CONNECTOR_COLS}
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "connector_oauth_started",
      entityType: "connector",
      entityId: connectorId,
    });
    const connector = mapConnector(rows[0]);
    const base =
      connector.config.gatewayUrl ||
      connector.config.host ||
      null;
    const path = connector.config.authorizePath || "/oauth/authorize";
    let authorizeUrl: string | null = null;
    if (base && /^https?:\/\//i.test(base)) {
      try {
        authorizeUrl = new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
      } catch {
        authorizeUrl = null;
      }
    }
    return { connector, authorizeUrl };
  });
}

export async function completeConnectorOauth(
  schemaName: string,
  userId: string,
  connectorId: string,
  input: OauthCompleteDto,
): Promise<ConnectorRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const status: ConnectorOauthStatus = input.success
      ? "connected"
      : "error";
    const rows = await tx.$queryRaw<ConnectorRow[]>`
      UPDATE agent_connectors SET
        oauth_status = ${status},
        updated_at = NOW()
      WHERE id = ${connectorId}::uuid AND kind = 'mcp'
      RETURNING ${CONNECTOR_COLS}
    `;
    if (!rows[0]) {
      throw new AgentsModuleError(404, "Connector MCP não encontrado.");
    }
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: input.success
        ? "connector_oauth_connected"
        : "connector_oauth_error",
      entityType: "connector",
      entityId: connectorId,
    });
    return mapConnector(rows[0]);
  });
}

export async function disconnectConnectorOauth(
  schemaName: string,
  userId: string,
  connectorId: string,
): Promise<ConnectorRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<ConnectorRow[]>`
      UPDATE agent_connectors SET
        oauth_status = 'disconnected',
        updated_at = NOW()
      WHERE id = ${connectorId}::uuid
      RETURNING ${CONNECTOR_COLS}
    `;
    if (!rows[0]) {
      throw new AgentsModuleError(404, "Connector não encontrado.");
    }
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "connector_oauth_disconnected",
      entityType: "connector",
      entityId: connectorId,
    });
    return mapConnector(rows[0]);
  });
}

export async function listMcpGateways(
  schemaName: string,
): Promise<ConnectorRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ConnectorRow[]>`
      SELECT ${CONNECTOR_COLS} FROM agent_connectors
      WHERE kind = 'mcp'
      ORDER BY created_at DESC
      LIMIT 50
    `,
  );
  return rows.map(mapConnector);
}
