import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import { normalizeScopes } from "./agents.permissions";
import type {
  ActorRole,
  AgentRecord,
  TaskRecord,
} from "./agents.types";

export type Tx = Prisma.TransactionClient;

export const AGENT_COLS = Prisma.sql`
  id, name, role, title, status,
  adapter_type AS "adapterType",
  capabilities,
  instructions,
  harness,
  permissions,
  last_heartbeat_at AS "lastHeartbeatAt",
  created_by_user_id AS "createdByUserId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const TASK_COLS = Prisma.sql`
  id, title, description, status, priority, visibility,
  assignee_agent_id AS "assigneeAgentId",
  created_by_user_id AS "createdByUserId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export type AgentRow = Omit<
  AgentRecord,
  | "createdAt"
  | "updatedAt"
  | "permissions"
  | "lastHeartbeatAt"
  | "harness"
  | "instructions"
> & {
  permissions: unknown;
  harness: unknown;
  instructions: string | null;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapHarness(value: unknown): AgentRecord["harness"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const harness: AgentRecord["harness"] = {};
  if (typeof raw.model === "string") harness.model = raw.model.slice(0, 120);
  if (typeof raw.maxTurns === "number" && Number.isFinite(raw.maxTurns)) {
    harness.maxTurns = Math.max(1, Math.min(500, Math.floor(raw.maxTurns)));
  }
  if (typeof raw.workingDirectory === "string") {
    harness.workingDirectory = raw.workingDirectory.slice(0, 500);
  }
  if (typeof raw.runtime === "string") harness.runtime = raw.runtime.slice(0, 64);
  if (typeof raw.notes === "string") harness.notes = raw.notes.slice(0, 2000);
  return harness;
}

export type TaskRow = Omit<TaskRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

export function mapAgent(row: AgentRow): AgentRecord {
  const permissions =
    row.permissions && typeof row.permissions === "object"
      ? (row.permissions as AgentRecord["permissions"])
      : { scopes: normalizeScopes([]) };
  return {
    ...row,
    instructions: row.instructions ?? null,
    harness: mapHarness(row.harness),
    permissions: {
      scopes: normalizeScopes(permissions.scopes),
      requireRunApproval: Boolean(permissions.requireRunApproval),
    },
    lastHeartbeatAt: row.lastHeartbeatAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapTask(row: TaskRow): TaskRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function writeActivity(
  tx: Tx,
  input: {
    actorType: "user" | "agent" | "system";
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    agentId?: string | null;
    runId?: string | null;
  },
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO agent_activity (
      actor_type, actor_id, action, entity_type, entity_id, agent_id, run_id
    ) VALUES (
      ${input.actorType}, ${input.actorId}, ${input.action},
      ${input.entityType}, ${input.entityId},
      ${input.agentId ?? null}::uuid, ${input.runId ?? null}::uuid
    )
  `;
}

export async function getActiveUserRole(
  schemaName: string,
  userId: string,
): Promise<ActorRole | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<Array<{ role: string }>>`
      SELECT role FROM users
      WHERE id = ${userId}::uuid AND is_active = true
      LIMIT 1
    `,
  );
  const role = rows[0]?.role;
  if (role === "user" || role === "admin" || role === "superadmin") return role;
  return null;
}
