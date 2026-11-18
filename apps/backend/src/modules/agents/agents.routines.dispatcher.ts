/**
 * Dispara routines due: cria task (+ run/wake se assignee) com claim idempotente.
 */

import { withTenantSchema } from "../../core/database/prisma";
import { cronMatchesAt } from "./agents.cron-match";
import { writeActivity } from "./agents.repository.shared";
import { enqueueRunExecution } from "./agents.runner";

const SYSTEM_ACTOR = "system:routine-cron";

type DueRoutine = {
  id: string;
  name: string;
  description: string | null;
  scheduleCron: string;
  assigneeAgentId: string | null;
  projectId: string | null;
};

export type RoutineDispatchResult = {
  considered: number;
  fired: number;
  woken: number;
  skipped: number;
  errors: number;
};

export async function listDueRoutines(
  schemaName: string,
  now: Date,
): Promise<DueRoutine[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string | null;
        scheduleCron: string;
        assigneeAgentId: string | null;
        projectId: string | null;
      }>
    >`
      SELECT id, name, description,
        schedule_cron AS "scheduleCron",
        assignee_agent_id AS "assigneeAgentId",
        project_id AS "projectId"
      FROM agent_routines
      WHERE status = 'active'
        AND schedule_cron IS NOT NULL
        AND length(trim(schedule_cron)) > 0
      ORDER BY created_at ASC
      LIMIT 200
    `,
  );
  return rows.filter((r) => cronMatchesAt(r.scheduleCron, now));
}

/**
 * Claim atômico por minuto UTC + cria task; se assignee, enfileira run.
 */
export async function fireRoutine(
  schemaName: string,
  routine: DueRoutine,
  now: Date,
): Promise<"fired" | "woken" | "skipped" | "error"> {
  try {
    const outcome = await withTenantSchema(schemaName, async (tx) => {
      const claimed = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE agent_routines SET
          last_fired_at = ${now},
          last_fire_error = NULL,
          updated_at = NOW()
        WHERE id = ${routine.id}::uuid
          AND status = 'active'
          AND (
            last_fired_at IS NULL
            OR last_fired_at < date_trunc('minute', ${now}::timestamptz)
          )
        RETURNING id
      `;
      if (!claimed[0]) return { kind: "skipped" as const };

      const title = `[routine] ${routine.name}`.slice(0, 200);
      const description = [
        routine.description?.trim() || null,
        `Disparada automaticamente pela rotina ${routine.id}.`,
        routine.projectId ? `project=${routine.projectId}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const tasks = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO agent_tasks (
          title, description, status, priority, visibility,
          assignee_agent_id, created_by_user_id
        ) VALUES (
          ${title}, ${description},
          'todo', 'medium', 'open',
          ${routine.assigneeAgentId}::uuid,
          ${SYSTEM_ACTOR}
        )
        RETURNING id
      `;
      const taskId = tasks[0].id;

      await writeActivity(tx, {
        actorType: "system",
        actorId: SYSTEM_ACTOR,
        action: "routine_fired",
        entityType: "routine",
        entityId: routine.id,
        agentId: routine.assigneeAgentId,
      });

      if (!routine.assigneeAgentId) {
        return { kind: "fired" as const, runId: null as string | null };
      }

      const agents = await tx.$queryRaw<
        Array<{ id: string; adapterType: string; permissions: unknown }>
      >`
        SELECT id, adapter_type AS "adapterType", permissions
        FROM agents WHERE id = ${routine.assigneeAgentId}::uuid LIMIT 1
      `;
      if (!agents[0]) {
        await tx.$executeRaw`
          UPDATE agent_routines SET
            last_fire_error = ${"Assignee agent não encontrado"},
            updated_at = NOW()
          WHERE id = ${routine.id}::uuid
        `;
        return { kind: "fired" as const, runId: null as string | null };
      }

      const adapterType = agents[0].adapterType || "stub";
      const perms =
        agents[0].permissions && typeof agents[0].permissions === "object"
          ? (agents[0].permissions as { requireRunApproval?: boolean })
          : {};
      const runRows = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO agent_runs (
          agent_id, task_id, status, adapter_type, requested_by_user_id
        ) VALUES (
          ${routine.assigneeAgentId}::uuid, ${taskId}::uuid,
          'queued', ${adapterType}, ${SYSTEM_ACTOR}
        )
        RETURNING id
      `;
      const runId = runRows[0].id;
      if (perms.requireRunApproval) {
        await tx.$executeRaw`
          INSERT INTO agent_approvals (
            type, status, payload, related_task_id, related_run_id,
            requested_by_user_id
          ) VALUES (
            'agent_run', 'pending',
            ${JSON.stringify({
              agentId: routine.assigneeAgentId,
              taskId,
              routineId: routine.id,
            })}::jsonb,
            ${taskId}::uuid, ${runId}::uuid, ${SYSTEM_ACTOR}
          )
        `;
        return { kind: "fired" as const, runId: null };
      }
      return { kind: "woken" as const, runId };
    });

    if (outcome.kind === "skipped") return "skipped";
    if (outcome.runId) {
      enqueueRunExecution(schemaName, outcome.runId);
      return "woken";
    }
    return outcome.kind === "woken" ? "woken" : "fired";
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 400) : "RoutineFireError";
    await withTenantSchema(schemaName, (tx) =>
      tx.$executeRaw`
        UPDATE agent_routines SET
          last_fire_error = ${message},
          updated_at = NOW()
        WHERE id = ${routine.id}::uuid
      `,
    ).catch(() => undefined);
    return "error";
  }
}

export async function dispatchTenantRoutines(
  schemaName: string,
  now: Date = new Date(),
): Promise<RoutineDispatchResult> {
  const due = await listDueRoutines(schemaName, now);
  const result: RoutineDispatchResult = {
    considered: due.length,
    fired: 0,
    woken: 0,
    skipped: 0,
    errors: 0,
  };
  for (const routine of due) {
    const status = await fireRoutine(schemaName, routine, now);
    if (status === "fired") result.fired += 1;
    else if (status === "woken") {
      result.fired += 1;
      result.woken += 1;
    } else if (status === "skipped") result.skipped += 1;
    else result.errors += 1;
  }
  return result;
}
