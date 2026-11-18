import { AgentsModuleError } from "./agents.errors";
import {
  agentHasScope,
  canViewTask,
  isTenantAdmin,
} from "./agents.permissions";
import * as repo from "./agents.repository";
import * as runnerRepo from "./agents.repository.runner";
import * as searchRepo from "./agents.repository.search";
import { enqueueRunExecution } from "./agents.runner";
import {
  assertAttachmentQuota,
  persistCommentAttachmentFile,
} from "./agents.comments.attachments";
import type {
  CreateAgentDto,
  CreateCommentDto,
  CreateCommentReceiptDto,
  CreateRunDto,
  CreateTaskDto,
  DecideApprovalDto,
  UpdateAgentDto,
  UpdateTaskDto,
} from "./agents.schema";
import type { AgentsActor, CommentAttachmentRecord } from "./agents.types";

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
    return repo.createComment(schemaName, userId, taskId, input);
  }

  async uploadCommentAttachment(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    taskId: string,
    commentId: string,
    file: { filename: string; mimetype: string; buffer: Buffer },
  ): Promise<CommentAttachmentRecord> {
    await this.getTask(schemaName, userId, role, taskId);
    await repo.assertCommentOnTask(schemaName, taskId, commentId);
    const count = await repo.countAttachments(schemaName, commentId);
    assertAttachmentQuota(count);
    const stored = await persistCommentAttachmentFile({
      schemaName,
      taskId,
      filename: file.filename,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });
    return repo.insertFileAttachment(schemaName, commentId, stored);
  }

  async addCommentReceipt(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    taskId: string,
    commentId: string,
    input: CreateCommentReceiptDto,
  ): Promise<CommentAttachmentRecord> {
    await this.getTask(schemaName, userId, role, taskId);
    await repo.assertCommentOnTask(schemaName, taskId, commentId);
    const count = await repo.countAttachments(schemaName, commentId);
    assertAttachmentQuota(count);
    return repo.insertReceiptAttachment(schemaName, commentId, {
      amountCents: input.amountCents,
      currency: input.currency,
      note: input.note,
    });
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
    const result = await repo.createRun(
      schemaName,
      userId,
      agentId,
      input.taskId ?? null,
    );
    // Sem approval pendente → runner real (claim + adapter + heartbeats).
    if (!result.approval) {
      enqueueRunExecution(schemaName, result.run.id);
    }
    return result;
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
    const result = await repo.decideApproval(
      schemaName,
      userId,
      approvalId,
      input.decision,
      input.decisionNote ?? null,
    );
    if (result.runIdToEnqueue) {
      enqueueRunExecution(schemaName, result.runIdToEnqueue);
    }
    return result.approval;
  }

  async getLiveDashboard(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
  ) {
    await requireActor(schemaName, userId, role);
    return runnerRepo.getLiveDashboard(schemaName);
  }

  async search(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    query: string,
    limitPerType: number,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    return searchRepo.searchAgentsEntities(
      schemaName,
      actor,
      query,
      limitPerType,
    );
  }

  async listRuns(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    limit: number,
    offset: number,
    filters: { agentId?: string; taskId?: string },
  ) {
    const actor = await requireActor(schemaName, userId, role);
    if (filters.taskId) {
      await this.getTask(schemaName, userId, role, filters.taskId);
    }
    const runs = await repo.listRuns(schemaName, limit, offset, filters);
    if (isTenantAdmin(actor)) return runs;
    const visible: typeof runs = [];
    for (const run of runs) {
      if (!run.taskId) {
        visible.push(run);
        continue;
      }
      const task = await repo.getTask(schemaName, run.taskId);
      if (task && canViewTask(actor, task)) visible.push(run);
    }
    return visible;
  }

  async getRun(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    runId: string,
  ) {
    const actor = await requireActor(schemaName, userId, role);
    const run = await repo.getRun(schemaName, runId);
    if (!run) throw new AgentsModuleError(404, "Run não encontrado.");
    if (run.taskId) {
      const task = await repo.getTask(schemaName, run.taskId);
      if (!task || !canViewTask(actor, task)) {
        throw new AgentsModuleError(404, "Run não encontrado.");
      }
    }
    return run;
  }

  async listActivity(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    limit: number,
    offset: number,
    filters: { agentId?: string; entityType?: string; entityId?: string },
  ) {
    await requireActor(schemaName, userId, role);
    return repo.listActivity(schemaName, limit, offset, filters);
  }
}

export const agentsService = new AgentsService();
