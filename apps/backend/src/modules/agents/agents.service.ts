import { AgentsModuleError } from "./agents.errors";
import {
  agentHasScope,
  canViewTask,
  isTenantAdmin,
} from "./agents.permissions";
import * as repo from "./agents.repository";
import type {
  CreateAgentDto,
  CreateCommentDto,
  CreateRunDto,
  CreateTaskDto,
  DecideApprovalDto,
  UpdateAgentDto,
  UpdateTaskDto,
} from "./agents.schema";
import type { AgentsActor } from "./agents.types";
import { wireAuthenticatedAgentMemory } from "../memory/memory.agent.bridge";

async function requireActor(
  schemaName: string,
  userId: string,
  _roleHint: AgentsActor["role"],
): Promise<AgentsActor> {
  const dbRole = await repo.getActiveUserRole(schemaName, userId);
  if (!dbRole) {
    throw new AgentsModuleError(401, "Usuário autenticado não está ativo.");
  }
  // Papel autoritativo vem do tenant (não confiar só no JWT).
  return { userId, role: dbRole };
}

export class AgentsService {
  async listAgents(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    limit: number,
    offset: number,
  ) {
    await requireActor(schemaName, userId, role);
    return repo.listAgents(schemaName, limit, offset);
  }

  async getAgent(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
  ) {
    await requireActor(schemaName, userId, role);
    const agent = await repo.getAgent(schemaName, agentId);
    if (!agent) throw new AgentsModuleError(404, "Agente não encontrado.");
    return agent;
  }

  async createAgent(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    input: CreateAgentDto,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    if (!isTenantAdmin(actor)) {
      throw new AgentsModuleError(403, "Somente admin pode criar agentes.");
    }
    return repo.createAgent(schemaName, userId, input);
  }

  async updateAgent(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    input: UpdateAgentDto,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    if (!isTenantAdmin(actor)) {
      throw new AgentsModuleError(403, "Somente admin pode atualizar agentes.");
    }
    return repo.updateAgent(schemaName, userId, agentId, input);
  }

  async listTasks(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    limit: number,
    offset: number,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    const tasks = await repo.listTasks(schemaName, limit, offset);
    return tasks.filter((task) => canViewTask(actor, task));
  }

  async getTask(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    taskId: string,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    const task = await repo.getTask(schemaName, taskId);
    if (!task || !canViewTask(actor, task)) {
      throw new AgentsModuleError(404, "Tarefa não encontrada.");
    }
    return task;
  }

  async createTask(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    input: CreateTaskDto,
  ) {
    await requireActor(schemaName, userId, role);
    return repo.createTask(schemaName, userId, input);
  }

  async updateTask(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    taskId: string,
    input: UpdateTaskDto,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    const task = await repo.getTask(schemaName, taskId);
    if (!task || !canViewTask(actor, task)) {
      throw new AgentsModuleError(404, "Tarefa não encontrada.");
    }
    if (!isTenantAdmin(actor) && task.createdByUserId !== userId) {
      throw new AgentsModuleError(403, "Sem permissão para alterar esta tarefa.");
    }
    return repo.updateTask(schemaName, userId, taskId, input);
  }

  async listComments(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    taskId: string,
  ) {
    await this.getTask(schemaName, userId, role, taskId);
    return repo.listComments(schemaName, taskId);
  }

  async createComment(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    taskId: string,
    input: CreateCommentDto,
  ) {
    await this.getTask(schemaName, userId, role, taskId);
    const comment = await repo.createComment(
      schemaName,
      userId,
      taskId,
      input,
    );
    // Captura/recuperação só no SaaS — nunca envia memória a runtime externo.
    const memory = await wireAuthenticatedAgentMemory({
      schemaName,
      userId,
      message: input.body,
      sourceReference: `agents:task:${taskId}`,
    });
    return {
      ...comment,
      memoryContext: memory.memoryContext,
      memoryCaptureCreated: memory.memoryCaptureCreated,
    };
  }

  async createRun(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    input: CreateRunDto,
  ) {
    await requireActor(schemaName, userId, role);
    const agent = await repo.getAgent(schemaName, agentId);
    if (!agent) throw new AgentsModuleError(404, "Agente não encontrado.");
    if (!agentHasScope(agent.permissions.scopes, "agents:run")) {
      throw new AgentsModuleError(
        403,
        "Agente sem capability agents:run.",
      );
    }
    if (input.taskId) {
      await this.getTask(schemaName, userId, role, input.taskId);
    }
    return repo.createRun(schemaName, userId, agentId, input.taskId ?? null);
  }

  async listApprovals(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    limit: number,
    offset: number,
    status?: "pending" | "approved" | "rejected",
  ) {
    const actor = await requireActor(schemaName, userId, role);
    if (!isTenantAdmin(actor)) {
      throw new AgentsModuleError(403, "Somente admin pode listar aprovações.");
    }
    return repo.listApprovals(schemaName, limit, offset, status);
  }

  async decideApproval(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    approvalId: string,
    input: DecideApprovalDto,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    if (!isTenantAdmin(actor)) {
      throw new AgentsModuleError(403, "Somente admin pode decidir aprovações.");
    }
    return repo.decideApproval(
      schemaName,
      userId,
      approvalId,
      input.decision,
      input.decisionNote ?? null,
    );
  }
}

export const agentsService = new AgentsService();
