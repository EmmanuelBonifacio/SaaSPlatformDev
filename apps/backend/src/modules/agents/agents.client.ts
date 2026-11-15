/**
 * Client interno in-process para outros módulos do backend.
 * Usa agentsService + withTenantSchema — sem HTTP e sem Paperclip.
 */
import { agentsService } from "./agents.service";
import type {
  CreateAgentDto,
  CreateCommentDto,
  CreateRunDto,
  CreateTaskDto,
  DecideApprovalDto,
  UpdateAgentDto,
  UpdateTaskDto,
} from "./agents.schema";
import type { ActorRole } from "./agents.types";

export type AgentsInternalClientContext = {
  schemaName: string;
  userId: string;
  role: ActorRole;
};

export function createAgentsInternalClient(ctx: AgentsInternalClientContext) {
  const { schemaName, userId, role } = ctx;

  return {
    listAgents(limit = 25, offset = 0) {
      return agentsService.listAgents(schemaName, userId, role, limit, offset);
    },
    getAgent(agentId: string) {
      return agentsService.getAgent(schemaName, userId, role, agentId);
    },
    createAgent(input: CreateAgentDto) {
      return agentsService.createAgent(schemaName, userId, role, input);
    },
    updateAgent(agentId: string, input: UpdateAgentDto) {
      return agentsService.updateAgent(schemaName, userId, role, agentId, input);
    },
    listTasks(limit = 25, offset = 0) {
      return agentsService.listTasks(schemaName, userId, role, limit, offset);
    },
    getTask(taskId: string) {
      return agentsService.getTask(schemaName, userId, role, taskId);
    },
    createTask(input: CreateTaskDto) {
      return agentsService.createTask(schemaName, userId, role, input);
    },
    updateTask(taskId: string, input: UpdateTaskDto) {
      return agentsService.updateTask(schemaName, userId, role, taskId, input);
    },
    listComments(taskId: string) {
      return agentsService.listComments(schemaName, userId, role, taskId);
    },
    createComment(taskId: string, input: CreateCommentDto) {
      return agentsService.createComment(
        schemaName,
        userId,
        role,
        taskId,
        input,
      );
    },
    createRun(agentId: string, input: CreateRunDto = {}) {
      return agentsService.createRun(schemaName, userId, role, agentId, input);
    },
    listApprovals(
      limit = 25,
      offset = 0,
      status?: "pending" | "approved" | "rejected",
    ) {
      return agentsService.listApprovals(
        schemaName,
        userId,
        role,
        limit,
        offset,
        status,
      );
    },
    decideApproval(approvalId: string, input: DecideApprovalDto) {
      return agentsService.decideApproval(
        schemaName,
        userId,
        role,
        approvalId,
        input,
      );
    },
  };
}

export type AgentsInternalClient = ReturnType<typeof createAgentsInternalClient>;
