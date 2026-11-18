/**
 * Cases + Workspaces CRUD (SP-41) — tenant-scoped via withTenantSchema.
 */

import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type {
  CreateCaseDto,
  CreateWorkspaceDto,
  UpdateCaseDto,
  UpdateWorkspaceDto,
} from "./agents.work.schema";
import type { CaseRecord, WorkspaceRecord } from "./agents.work.types";

type CaseRow = Omit<CaseRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};
type WorkspaceRow = Omit<WorkspaceRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

const mapCase = (r: CaseRow): CaseRecord => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const mapWorkspace = (r: WorkspaceRow): WorkspaceRecord => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export async function listCases(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<CaseRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<CaseRow[]>`
      SELECT id, name, description, status, priority,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_cases
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapCase);
}

export async function createCase(
  schemaName: string,
  userId: string,
  input: CreateCaseDto,
): Promise<CaseRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<CaseRow[]>`
      INSERT INTO agent_cases (
        name, description, status, priority,
        project_id, assignee_agent_id, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.description ?? null},
        ${input.status ?? "open"}, ${input.priority ?? "medium"},
        ${input.projectId ?? null}::uuid,
        ${input.assigneeAgentId ?? null}::uuid,
        ${userId}
      )
      RETURNING id, name, description, status, priority,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "case_created",
      entityType: "case",
      entityId: rows[0].id,
    });
    return mapCase(rows[0]);
  });
}

export async function updateCase(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateCaseDto,
): Promise<CaseRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<CaseRow[]>`
      SELECT id, name, description, status, priority,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_cases WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!current[0]) {
      throw new AgentsModuleError(404, "Case não encontrado.");
    }
    const c = mapCase(current[0]);
    const rows = await tx.$queryRaw<CaseRow[]>`
      UPDATE agent_cases SET
        name = ${input.name ?? c.name},
        description = ${
          input.description === undefined ? c.description : input.description
        },
        status = ${input.status ?? c.status},
        priority = ${input.priority ?? c.priority},
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
      RETURNING id, name, description, status, priority,
        project_id AS "projectId",
        assignee_agent_id AS "assigneeAgentId",
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "case_updated",
      entityType: "case",
      entityId: id,
    });
    return mapCase(rows[0]);
  });
}

export async function listWorkspaces(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<WorkspaceRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<WorkspaceRow[]>`
      SELECT id, name, description, status, kind,
        project_id AS "projectId",
        working_directory AS "workingDirectory",
        uri,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_workspaces
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapWorkspace);
}

export async function createWorkspace(
  schemaName: string,
  userId: string,
  input: CreateWorkspaceDto,
): Promise<WorkspaceRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<WorkspaceRow[]>`
      INSERT INTO agent_workspaces (
        name, description, status, kind,
        project_id, working_directory, uri, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.description ?? null},
        ${input.status ?? "active"}, ${input.kind ?? "execution"},
        ${input.projectId ?? null}::uuid,
        ${input.workingDirectory ?? null},
        ${input.uri ?? null},
        ${userId}
      )
      RETURNING id, name, description, status, kind,
        project_id AS "projectId",
        working_directory AS "workingDirectory",
        uri,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "workspace_created",
      entityType: "workspace",
      entityId: rows[0].id,
    });
    return mapWorkspace(rows[0]);
  });
}

export async function updateWorkspace(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateWorkspaceDto,
): Promise<WorkspaceRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<WorkspaceRow[]>`
      SELECT id, name, description, status, kind,
        project_id AS "projectId",
        working_directory AS "workingDirectory",
        uri,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_workspaces WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!current[0]) {
      throw new AgentsModuleError(404, "Workspace não encontrado.");
    }
    const c = mapWorkspace(current[0]);
    const rows = await tx.$queryRaw<WorkspaceRow[]>`
      UPDATE agent_workspaces SET
        name = ${input.name ?? c.name},
        description = ${
          input.description === undefined ? c.description : input.description
        },
        status = ${input.status ?? c.status},
        kind = ${input.kind ?? c.kind},
        project_id = ${
          input.projectId === undefined ? c.projectId : input.projectId
        }::uuid,
        working_directory = ${
          input.workingDirectory === undefined
            ? c.workingDirectory
            : input.workingDirectory
        },
        uri = ${input.uri === undefined ? c.uri : input.uri},
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, name, description, status, kind,
        project_id AS "projectId",
        working_directory AS "workingDirectory",
        uri,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "workspace_updated",
      entityType: "workspace",
      entityId: id,
    });
    return mapWorkspace(rows[0]);
  });
}
