import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type {
  CreateArtifactDto,
  CreateGoalDto,
  CreateProjectDto,
  CreateRoutineDto,
  UpdateArtifactDto,
  UpdateGoalDto,
  UpdateProjectDto,
  UpdateRoutineDto,
} from "./agents.work.schema";
import type {
  ArtifactRecord,
  GoalRecord,
  ProjectRecord,
  RoutineRecord,
} from "./agents.work.types";

type ProjectRow = Omit<ProjectRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};
type RoutineRow = Omit<
  RoutineRecord,
  "createdAt" | "updatedAt" | "lastFiredAt"
> & {
  lastFiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type GoalRow = Omit<GoalRecord, "createdAt" | "updatedAt" | "targetDate"> & {
  targetDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type ArtifactRow = Omit<ArtifactRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

const mapProject = (r: ProjectRow): ProjectRecord => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
const mapRoutine = (r: RoutineRow): RoutineRecord => ({
  ...r,
  assigneeAgentId: r.assigneeAgentId ?? null,
  lastFiredAt: r.lastFiredAt?.toISOString() ?? null,
  lastFireError: r.lastFireError ?? null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const mapGoal = (r: GoalRow): GoalRecord => ({
  ...r,
  targetDate: r.targetDate
    ? r.targetDate.toISOString().slice(0, 10)
    : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
const mapArtifact = (r: ArtifactRow): ArtifactRecord => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export async function listProjects(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<ProjectRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ProjectRow[]>`
      SELECT id, name, description, status, starred,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_projects
      ORDER BY starred DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapProject);
}

export async function createProject(
  schemaName: string,
  userId: string,
  input: CreateProjectDto,
): Promise<ProjectRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<ProjectRow[]>`
      INSERT INTO agent_projects (
        name, description, status, starred, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.description ?? null},
        ${input.status ?? "active"}, ${input.starred ?? false}, ${userId}
      )
      RETURNING id, name, description, status, starred,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "project_created",
      entityType: "project",
      entityId: rows[0].id,
    });
    return mapProject(rows[0]);
  });
}

export async function updateProject(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateProjectDto,
): Promise<ProjectRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<ProjectRow[]>`
      SELECT id, name, description, status, starred,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_projects WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!current[0]) throw new AgentsModuleError(404, "Projeto não encontrado.");
    const c = mapProject(current[0]);
    const rows = await tx.$queryRaw<ProjectRow[]>`
      UPDATE agent_projects SET
        name = ${input.name ?? c.name},
        description = ${
          input.description === undefined ? c.description : input.description
        },
        status = ${input.status ?? c.status},
        starred = ${input.starred ?? c.starred},
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name, description, status, starred,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "project_updated",
      entityType: "project",
      entityId: id,
    });
    return mapProject(rows[0]);
  });
}

export async function listRoutines(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<RoutineRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<RoutineRow[]>`
      SELECT id, name, description,
        schedule_cron AS "scheduleCron", status,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        last_fired_at AS "lastFiredAt",
        last_fire_error AS "lastFireError",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_routines
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapRoutine);
}

export async function createRoutine(
  schemaName: string,
  userId: string,
  input: CreateRoutineDto,
): Promise<RoutineRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<RoutineRow[]>`
      INSERT INTO agent_routines (
        name, description, schedule_cron, status,
        project_id, assignee_agent_id, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.description ?? null},
        ${input.scheduleCron ?? null}, ${input.status ?? "active"},
        ${input.projectId ?? null}::uuid,
        ${input.assigneeAgentId ?? null}::uuid,
        ${userId}
      )
      RETURNING id, name, description,
        schedule_cron AS "scheduleCron", status,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        last_fired_at AS "lastFiredAt",
        last_fire_error AS "lastFireError",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "routine_created",
      entityType: "routine",
      entityId: rows[0].id,
    });
    return mapRoutine(rows[0]);
  });
}

export async function updateRoutine(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateRoutineDto,
): Promise<RoutineRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<RoutineRow[]>`
      SELECT id, name, description,
        schedule_cron AS "scheduleCron", status,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        last_fired_at AS "lastFiredAt",
        last_fire_error AS "lastFireError",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_routines WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!current[0]) throw new AgentsModuleError(404, "Rotina não encontrada.");
    const c = mapRoutine(current[0]);
    const rows = await tx.$queryRaw<RoutineRow[]>`
      UPDATE agent_routines SET
        name = ${input.name ?? c.name},
        description = ${
          input.description === undefined ? c.description : input.description
        },
        schedule_cron = ${
          input.scheduleCron === undefined ? c.scheduleCron : input.scheduleCron
        },
        status = ${input.status ?? c.status},
        project_id = ${
          input.projectId === undefined ? c.projectId : input.projectId
        }::uuid,
        assignee_agent_id = ${
          input.assigneeAgentId === undefined
            ? c.assigneeAgentId
            : input.assigneeAgentId
        }::uuid,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name, description,
        schedule_cron AS "scheduleCron", status,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        last_fired_at AS "lastFiredAt",
        last_fire_error AS "lastFireError",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "routine_updated",
      entityType: "routine",
      entityId: id,
    });
    return mapRoutine(rows[0]);
  });
}

export async function listGoals(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<GoalRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<GoalRow[]>`
      SELECT id, name, description, status,
        project_id AS "projectId",
        target_date AS "targetDate",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_goals
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapGoal);
}

export async function createGoal(
  schemaName: string,
  userId: string,
  input: CreateGoalDto,
): Promise<GoalRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<GoalRow[]>`
      INSERT INTO agent_goals (
        name, description, status, project_id, target_date, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.description ?? null},
        ${input.status ?? "open"}, ${input.projectId ?? null}::uuid,
        ${input.targetDate ?? null}::date, ${userId}
      )
      RETURNING id, name, description, status,
        project_id AS "projectId",
        target_date AS "targetDate",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "goal_created",
      entityType: "goal",
      entityId: rows[0].id,
    });
    return mapGoal(rows[0]);
  });
}

export async function updateGoal(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateGoalDto,
): Promise<GoalRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<GoalRow[]>`
      SELECT id, name, description, status,
        project_id AS "projectId",
        target_date AS "targetDate",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_goals WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!current[0]) throw new AgentsModuleError(404, "Goal não encontrado.");
    const c = mapGoal(current[0]);
    const rows = await tx.$queryRaw<GoalRow[]>`
      UPDATE agent_goals SET
        name = ${input.name ?? c.name},
        description = ${
          input.description === undefined ? c.description : input.description
        },
        status = ${input.status ?? c.status},
        project_id = ${
          input.projectId === undefined ? c.projectId : input.projectId
        }::uuid,
        target_date = ${
          input.targetDate === undefined ? c.targetDate : input.targetDate
        }::date,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name, description, status,
        project_id AS "projectId",
        target_date AS "targetDate",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "goal_updated",
      entityType: "goal",
      entityId: id,
    });
    return mapGoal(rows[0]);
  });
}

export async function listArtifacts(
  schemaName: string,
  limit: number,
  offset: number,
  filters: { taskId?: string; projectId?: string } = {},
): Promise<ArtifactRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) => {
    if (filters.taskId) {
      return tx.$queryRaw<ArtifactRow[]>`
        SELECT id, name, kind, content, uri,
          task_id AS "taskId", project_id AS "projectId",
          created_by_user_id AS "createdByUserId",
          created_at AS "createdAt", updated_at AS "updatedAt"
        FROM agent_artifacts
        WHERE task_id = ${filters.taskId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    if (filters.projectId) {
      return tx.$queryRaw<ArtifactRow[]>`
        SELECT id, name, kind, content, uri,
          task_id AS "taskId", project_id AS "projectId",
          created_by_user_id AS "createdByUserId",
          created_at AS "createdAt", updated_at AS "updatedAt"
        FROM agent_artifacts
        WHERE project_id = ${filters.projectId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    return tx.$queryRaw<ArtifactRow[]>`
      SELECT id, name, kind, content, uri,
        task_id AS "taskId", project_id AS "projectId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_artifacts
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });
  return rows.map(mapArtifact);
}

export async function createArtifact(
  schemaName: string,
  userId: string,
  input: CreateArtifactDto,
): Promise<ArtifactRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<ArtifactRow[]>`
      INSERT INTO agent_artifacts (
        name, kind, content, uri, task_id, project_id, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.kind}, ${input.content ?? null},
        ${input.uri ?? null}, ${input.taskId ?? null}::uuid,
        ${input.projectId ?? null}::uuid, ${userId}
      )
      RETURNING id, name, kind, content, uri,
        task_id AS "taskId", project_id AS "projectId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "artifact_created",
      entityType: "artifact",
      entityId: rows[0].id,
    });
    return mapArtifact(rows[0]);
  });
}

export async function updateArtifact(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateArtifactDto,
): Promise<ArtifactRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<ArtifactRow[]>`
      SELECT id, name, kind, content, uri,
        task_id AS "taskId", project_id AS "projectId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_artifacts WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!current[0]) {
      throw new AgentsModuleError(404, "Artifact não encontrado.");
    }
    const c = mapArtifact(current[0]);
    const rows = await tx.$queryRaw<ArtifactRow[]>`
      UPDATE agent_artifacts SET
        name = ${input.name ?? c.name},
        kind = ${input.kind ?? c.kind},
        content = ${input.content === undefined ? c.content : input.content},
        uri = ${input.uri === undefined ? c.uri : input.uri},
        task_id = ${input.taskId === undefined ? c.taskId : input.taskId}::uuid,
        project_id = ${
          input.projectId === undefined ? c.projectId : input.projectId
        }::uuid,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name, kind, content, uri,
        task_id AS "taskId", project_id AS "projectId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "artifact_updated",
      entityType: "artifact",
      entityId: id,
    });
    return mapArtifact(rows[0]);
  });
}
