import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type {
  CreateSecretRefDto,
  UpdateBudgetDto,
  UpsertToolDto,
} from "./agents.schema";
import type {
  AgentBudgetRecord,
  AgentSecretRefRecord,
  AgentToolRecord,
} from "./agents.types";

type SecretRow = {
  id: string;
  agentId: string;
  name: string;
  envRef: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ToolRow = {
  id: string;
  agentId: string;
  toolKey: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetRow = {
  agentId: string;
  period: AgentBudgetRecord["period"];
  softLimitCents: number | null;
  hardLimitCents: number | null;
  spentCents: number;
  alertThresholdPct: number;
  createdAt: Date;
  updatedAt: Date;
};

function mapSecret(row: SecretRow): AgentSecretRefRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTool(row: ToolRow): AgentToolRecord {
  return {
    ...row,
    config: row.config ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBudget(row: BudgetRow): AgentBudgetRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireAgent(schemaName: string, agentId: string): Promise<void> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM agents WHERE id = ${agentId}::uuid LIMIT 1
    `,
  );
  if (!rows[0]) throw new AgentsModuleError(404, "Agente não encontrado.");
}

export async function listSecretRefs(
  schemaName: string,
  agentId: string,
): Promise<AgentSecretRefRecord[]> {
  await requireAgent(schemaName, agentId);
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<SecretRow[]>`
      SELECT id, agent_id AS "agentId", name,
        env_ref AS "envRef", description,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_secret_refs
      WHERE agent_id = ${agentId}::uuid
      ORDER BY created_at DESC
      LIMIT 100
    `,
  );
  return rows.map(mapSecret);
}

export async function createSecretRef(
  schemaName: string,
  userId: string,
  agentId: string,
  input: CreateSecretRefDto,
): Promise<AgentSecretRefRecord> {
  await requireAgent(schemaName, agentId);
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<SecretRow[]>`
      INSERT INTO agent_secret_refs (agent_id, name, env_ref, description)
      VALUES (
        ${agentId}::uuid, ${input.name}, ${input.envRef},
        ${input.description ?? null}
      )
      RETURNING id, agent_id AS "agentId", name,
        env_ref AS "envRef", description,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "agent_secret_ref_created",
      entityType: "agent",
      entityId: agentId,
      agentId,
    });
    return mapSecret(rows[0]);
  });
}

export async function deleteSecretRef(
  schemaName: string,
  userId: string,
  agentId: string,
  secretId: string,
): Promise<void> {
  await requireAgent(schemaName, agentId);
  await withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      DELETE FROM agent_secret_refs
      WHERE id = ${secretId}::uuid AND agent_id = ${agentId}::uuid
      RETURNING id
    `;
    if (!rows[0]) {
      throw new AgentsModuleError(404, "Secret ref não encontrado.");
    }
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "agent_secret_ref_deleted",
      entityType: "agent",
      entityId: agentId,
      agentId,
    });
  });
}

export async function listTools(
  schemaName: string,
  agentId: string,
): Promise<AgentToolRecord[]> {
  await requireAgent(schemaName, agentId);
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ToolRow[]>`
      SELECT id, agent_id AS "agentId", tool_key AS "toolKey",
        enabled, config,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_tools
      WHERE agent_id = ${agentId}::uuid
      ORDER BY tool_key ASC
      LIMIT 50
    `,
  );
  return rows.map(mapTool);
}

export async function upsertTool(
  schemaName: string,
  userId: string,
  agentId: string,
  input: UpsertToolDto,
): Promise<AgentToolRecord> {
  await requireAgent(schemaName, agentId);
  const config = input.config ?? {};
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<ToolRow[]>`
      INSERT INTO agent_tools (agent_id, tool_key, enabled, config)
      VALUES (
        ${agentId}::uuid, ${input.toolKey}, ${input.enabled},
        ${JSON.stringify(config)}::jsonb
      )
      ON CONFLICT (agent_id, tool_key) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        config = EXCLUDED.config,
        updated_at = NOW()
      RETURNING id, agent_id AS "agentId", tool_key AS "toolKey",
        enabled, config,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "agent_tool_upserted",
      entityType: "agent",
      entityId: agentId,
      agentId,
    });
    return mapTool(rows[0]);
  });
}

export async function getBudget(
  schemaName: string,
  agentId: string,
): Promise<AgentBudgetRecord> {
  await requireAgent(schemaName, agentId);
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<BudgetRow[]>`
      INSERT INTO agent_budgets (agent_id)
      VALUES (${agentId}::uuid)
      ON CONFLICT (agent_id) DO UPDATE SET agent_id = EXCLUDED.agent_id
      RETURNING agent_id AS "agentId", period,
        soft_limit_cents AS "softLimitCents",
        hard_limit_cents AS "hardLimitCents",
        spent_cents AS "spentCents",
        alert_threshold_pct AS "alertThresholdPct",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    return mapBudget(rows[0]);
  });
}

export async function updateBudget(
  schemaName: string,
  userId: string,
  agentId: string,
  input: UpdateBudgetDto,
): Promise<AgentBudgetRecord> {
  const current = await getBudget(schemaName, agentId);
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<BudgetRow[]>`
      UPDATE agent_budgets SET
        period = ${input.period ?? current.period},
        soft_limit_cents = ${
          input.softLimitCents === undefined
            ? current.softLimitCents
            : input.softLimitCents
        },
        hard_limit_cents = ${
          input.hardLimitCents === undefined
            ? current.hardLimitCents
            : input.hardLimitCents
        },
        alert_threshold_pct = ${
          input.alertThresholdPct ?? current.alertThresholdPct
        },
        updated_at = NOW()
      WHERE agent_id = ${agentId}::uuid
      RETURNING agent_id AS "agentId", period,
        soft_limit_cents AS "softLimitCents",
        hard_limit_cents AS "hardLimitCents",
        spent_cents AS "spentCents",
        alert_threshold_pct AS "alertThresholdPct",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "agent_budget_updated",
      entityType: "agent",
      entityId: agentId,
      agentId,
    });
    return mapBudget(rows[0]);
  });
}
