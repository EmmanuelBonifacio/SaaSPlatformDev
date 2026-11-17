import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { normalizeScopes } from "./agents.permissions";
import type { CreateAgentDto, CreateTaskDto, UpdateAgentDto, UpdateTaskDto } from "./agents.schema";
import type { AgentRecord, TaskRecord } from "./agents.types";
import {
  AGENT_COLS,
  TASK_COLS,
  getActiveUserRole,
  mapAgent,
  mapTask,
  writeActivity,
  type AgentRow,
  type TaskRow,
} from "./agents.repository.shared";
import { assertValidReportsTo } from "./agents.repository.org-costs";

export { getActiveUserRole };

export async function listAgents(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<AgentRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AgentRow[]>`
      SELECT ${AGENT_COLS} FROM agents
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapAgent);
}

export async function getAgent(
  schemaName: string,
  agentId: string,
): Promise<AgentRecord | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AgentRow[]>`
      SELECT ${AGENT_COLS} FROM agents WHERE id = ${agentId}::uuid LIMIT 1
    `,
  );
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function createAgent(
  schemaName: string,
  userId: string,
  input: CreateAgentDto,
): Promise<AgentRecord> {
  const permissions = {
    scopes: normalizeScopes(input.permissions?.scopes),
    requireRunApproval: Boolean(input.permissions?.requireRunApproval),
  };
  if (input.reportsToAgentId) {
    await assertValidReportsTo(schemaName, "00000000-0000-0000-0000-000000000000", input.reportsToAgentId);
  }
  return withTenantSchema(schemaName, async (tx) => {
    const harness = input.harness ?? {};
    const rows = await tx.$queryRaw<AgentRow[]>`
      INSERT INTO agents (
        name, role, title, adapter_type, capabilities, instructions,
        harness, permissions, reports_to_agent_id, created_by_user_id
      ) VALUES (
        ${input.name}, ${input.role}, ${input.title ?? null},
        ${input.adapterType}, ${input.capabilities ?? null},
        ${input.instructions ?? null},
        ${JSON.stringify(harness)}::jsonb,
        ${JSON.stringify(permissions)}::jsonb,
        ${input.reportsToAgentId ?? null}::uuid,
        ${userId}
      )
      RETURNING ${AGENT_COLS}
    `;
    const agent = mapAgent(rows[0]);
    await tx.$executeRaw`
      INSERT INTO agent_budgets (agent_id) VALUES (${agent.id}::uuid)
      ON CONFLICT (agent_id) DO NOTHING
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "agent_created",
      entityType: "agent",
      entityId: agent.id,
      agentId: agent.id,
    });
    return agent;
  });
}

export async function updateAgent(
  schemaName: string,
  userId: string,
  agentId: string,
  input: UpdateAgentDto,
): Promise<AgentRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const existing = await tx.$queryRaw<AgentRow[]>`
      SELECT ${AGENT_COLS} FROM agents WHERE id = ${agentId}::uuid LIMIT 1
    `;
    if (!existing[0]) {
      throw new AgentsModuleError(404, "Agente não encontrado.");
    }
    const current = mapAgent(existing[0]);
    const permissions = {
      scopes: normalizeScopes(
        input.permissions?.scopes ?? current.permissions.scopes,
      ),
      requireRunApproval:
        input.permissions?.requireRunApproval ??
        Boolean(current.permissions.requireRunApproval),
    };
    const harness =
      input.harness === undefined
        ? current.harness
        : { ...current.harness, ...input.harness };
    const reportsTo =
      input.reportsToAgentId === undefined
        ? current.reportsToAgentId
        : input.reportsToAgentId;
    if (input.reportsToAgentId !== undefined) {
      await assertValidReportsTo(schemaName, agentId, reportsTo);
    }
    const rows = await tx.$queryRaw<AgentRow[]>`
      UPDATE agents SET
        name = ${input.name ?? current.name},
        role = ${input.role ?? current.role},
        title = ${input.title === undefined ? current.title : input.title},
        status = ${input.status ?? current.status},
        adapter_type = ${input.adapterType ?? current.adapterType},
        capabilities = ${
          input.capabilities === undefined
            ? current.capabilities
            : input.capabilities
        },
        instructions = ${
          input.instructions === undefined
            ? current.instructions
            : input.instructions
        },
        harness = ${JSON.stringify(harness)}::jsonb,
        permissions = ${JSON.stringify(permissions)}::jsonb,
        reports_to_agent_id = ${reportsTo}::uuid,
        updated_at = NOW()
      WHERE id = ${agentId}::uuid
      RETURNING ${AGENT_COLS}
    `;
    const agent = mapAgent(rows[0]);
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "agent_updated",
      entityType: "agent",
      entityId: agent.id,
      agentId: agent.id,
    });
    return agent;
  });
}

export async function listTasks(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<TaskRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<TaskRow[]>`
      SELECT ${TASK_COLS} FROM agent_tasks
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapTask);
}

export async function getTask(
  schemaName: string,
  taskId: string,
): Promise<TaskRecord | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<TaskRow[]>`
      SELECT ${TASK_COLS} FROM agent_tasks WHERE id = ${taskId}::uuid LIMIT 1
    `,
  );
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function createTask(
  schemaName: string,
  userId: string,
  input: CreateTaskDto,
): Promise<TaskRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    if (input.assigneeAgentId) {
      const agents = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM agents WHERE id = ${input.assigneeAgentId}::uuid LIMIT 1
      `;
      if (!agents[0]) {
        throw new AgentsModuleError(404, "Agente atribuído não encontrado.");
      }
    }
    const rows = await tx.$queryRaw<TaskRow[]>`
      INSERT INTO agent_tasks (
        title, description, status, priority, visibility,
        assignee_agent_id, created_by_user_id
      ) VALUES (
        ${input.title}, ${input.description ?? null}, ${input.status},
        ${input.priority}, ${input.visibility},
        ${input.assigneeAgentId ?? null}::uuid, ${userId}
      )
      RETURNING ${TASK_COLS}
    `;
    const task = mapTask(rows[0]);
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "task_created",
      entityType: "task",
      entityId: task.id,
      agentId: task.assigneeAgentId,
    });
    return task;
  });
}

export async function updateTask(
  schemaName: string,
  userId: string,
  taskId: string,
  input: UpdateTaskDto,
): Promise<TaskRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const existing = await tx.$queryRaw<TaskRow[]>`
      SELECT ${TASK_COLS} FROM agent_tasks WHERE id = ${taskId}::uuid LIMIT 1
    `;
    if (!existing[0]) {
      throw new AgentsModuleError(404, "Tarefa não encontrada.");
    }
    const current = mapTask(existing[0]);
    const assignee =
      input.assigneeAgentId === undefined
        ? current.assigneeAgentId
        : input.assigneeAgentId;
    if (assignee) {
      const agents = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM agents WHERE id = ${assignee}::uuid LIMIT 1
      `;
      if (!agents[0]) {
        throw new AgentsModuleError(404, "Agente atribuído não encontrado.");
      }
    }
    const rows = await tx.$queryRaw<TaskRow[]>`
      UPDATE agent_tasks SET
        title = ${input.title ?? current.title},
        description = ${
          input.description === undefined
            ? current.description
            : input.description
        },
        status = ${input.status ?? current.status},
        priority = ${input.priority ?? current.priority},
        visibility = ${input.visibility ?? current.visibility},
        assignee_agent_id = ${assignee}::uuid,
        updated_at = NOW()
      WHERE id = ${taskId}::uuid
      RETURNING ${TASK_COLS}
    `;
    const task = mapTask(rows[0]);
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "task_updated",
      entityType: "task",
      entityId: task.id,
      agentId: task.assigneeAgentId,
    });
    return task;
  });
}

export {
  createComment,
  createRun,
  decideApproval,
  listApprovals,
  listComments,
} from "./agents.repository.workflow";

export { getRun, listActivity, listRuns } from "./agents.repository.reads";

export {
  attachSkill,
  createSkill,
  detachSkill,
  getSkill,
  listSkillAttachments,
  listSkills,
  updateSkill,
} from "./agents.repository.skills";

export {
  completeConnectorOauth,
  createConnector,
  disconnectConnectorOauth,
  getConnector,
  listConnectors,
  listMcpGateways,
  startConnectorOauth,
  updateConnector,
} from "./agents.repository.connectors";

export {
  listSkillVersions,
  publishSkillVersion,
  restoreSkillVersion,
} from "./agents.repository.skill-versions";
