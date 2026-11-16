import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import type { ActivityRecord, RunRecord } from "./agents.types";

type RunRow = {
  id: string;
  agentId: string;
  taskId: string | null;
  status: RunRecord["status"];
  requestedByUserId: string;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

type ActivityRow = {
  id: string;
  actorType: ActivityRecord["actorType"];
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId: string | null;
  runId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
};

const RUN_COLS = Prisma.sql`
  id, agent_id AS "agentId", task_id AS "taskId", status,
  requested_by_user_id AS "requestedByUserId",
  error_message AS "errorMessage",
  started_at AS "startedAt", finished_at AS "finishedAt",
  created_at AS "createdAt"
`;

const ACTIVITY_COLS = Prisma.sql`
  id, actor_type AS "actorType", actor_id AS "actorId",
  action, entity_type AS "entityType", entity_id AS "entityId",
  agent_id AS "agentId", run_id AS "runId", details,
  created_at AS "createdAt"
`;

function mapRun(row: RunRow): RunRecord {
  return {
    ...row,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapActivity(row: ActivityRow): ActivityRecord {
  return {
    ...row,
    details: row.details ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRuns(
  schemaName: string,
  limit: number,
  offset: number,
  filters: { agentId?: string; taskId?: string },
): Promise<RunRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) => {
    if (filters.agentId && filters.taskId) {
      return tx.$queryRaw<RunRow[]>`
        SELECT ${RUN_COLS} FROM agent_runs
        WHERE agent_id = ${filters.agentId}::uuid
          AND task_id = ${filters.taskId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    if (filters.agentId) {
      return tx.$queryRaw<RunRow[]>`
        SELECT ${RUN_COLS} FROM agent_runs
        WHERE agent_id = ${filters.agentId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    if (filters.taskId) {
      return tx.$queryRaw<RunRow[]>`
        SELECT ${RUN_COLS} FROM agent_runs
        WHERE task_id = ${filters.taskId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    return tx.$queryRaw<RunRow[]>`
      SELECT ${RUN_COLS} FROM agent_runs
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });
  return rows.map(mapRun);
}

export async function getRun(
  schemaName: string,
  runId: string,
): Promise<RunRecord | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<RunRow[]>`
      SELECT ${RUN_COLS} FROM agent_runs
      WHERE id = ${runId}::uuid
      LIMIT 1
    `,
  );
  return rows[0] ? mapRun(rows[0]) : null;
}

export async function listActivity(
  schemaName: string,
  limit: number,
  offset: number,
  filters: { agentId?: string },
): Promise<ActivityRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) => {
    if (filters.agentId) {
      return tx.$queryRaw<ActivityRow[]>`
        SELECT ${ACTIVITY_COLS} FROM agent_activity
        WHERE agent_id = ${filters.agentId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    return tx.$queryRaw<ActivityRow[]>`
      SELECT ${ACTIVITY_COLS} FROM agent_activity
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });
  return rows.map(mapActivity);
}
