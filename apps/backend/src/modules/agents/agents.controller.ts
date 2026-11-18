import type { FastifyReply, FastifyRequest } from "fastify";
import { AgentsModuleError } from "./agents.errors";
import {
  agentIdParamSchema,
  createAgentSchema,
  createCommentSchema,
  createRunSchema,
  createTaskSchema,
  decideApprovalSchema,
  listActivityQuerySchema,
  listApprovalsQuerySchema,
  listRunsQuerySchema,
  paginationSchema,
  runIdParamSchema,
  searchQuerySchema,
  taskIdParamSchema,
  updateAgentSchema,
  updateTaskSchema,
  uuidParamSchema,
} from "./agents.schema";
import { agentsService } from "./agents.service";
import type { ActorRole } from "./agents.types";

function context(request: FastifyRequest) {
  if (!request.tenant) {
    throw new AgentsModuleError(401, "Contexto autenticado do tenant ausente.");
  }
  const userId = request.user?.sub;
  if (!userId || typeof userId !== "string") {
    throw new AgentsModuleError(401, "Identidade autenticada inválida.");
  }
  const role = (request.user.role ?? "user") as ActorRole;
  return {
    schemaName: request.tenant.schemaName,
    userId,
    role,
  };
}

export async function listAgentsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = paginationSchema.parse(request.query);
  return agentsService.listAgents(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
  );
}

export async function getAgentHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  return agentsService.getAgent(schemaName, userId, role, agentId);
}

export async function createAgentHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const input = createAgentSchema.parse(request.body);
  const agent = await agentsService.createAgent(
    schemaName,
    userId,
    role,
    input,
  );
  return reply.code(201).send(agent);
}

export async function updateAgentHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  const input = updateAgentSchema.parse(request.body);
  return agentsService.updateAgent(schemaName, userId, role, agentId, input);
}

export async function listTasksHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = paginationSchema.parse(request.query);
  return agentsService.listTasks(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
  );
}

export async function getTaskHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { taskId } = taskIdParamSchema.parse(request.params);
  return agentsService.getTask(schemaName, userId, role, taskId);
}

export async function createTaskHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const input = createTaskSchema.parse(request.body);
  const task = await agentsService.createTask(schemaName, userId, role, input);
  return reply.code(201).send(task);
}

export async function updateTaskHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { taskId } = taskIdParamSchema.parse(request.params);
  const input = updateTaskSchema.parse(request.body);
  return agentsService.updateTask(schemaName, userId, role, taskId, input);
}

export async function listCommentsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { taskId } = taskIdParamSchema.parse(request.params);
  return agentsService.listComments(schemaName, userId, role, taskId);
}

export async function createCommentHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { taskId } = taskIdParamSchema.parse(request.params);
  const input = createCommentSchema.parse(request.body);
  const comment = await agentsService.createComment(
    schemaName,
    userId,
    role,
    taskId,
    input,
  );
  return reply.code(201).send(comment);
}

export async function createRunHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  const input = createRunSchema.parse(request.body ?? {});
  const result = await agentsService.createRun(
    schemaName,
    userId,
    role,
    agentId,
    input,
  );
  return reply.code(201).send(result);
}

export async function listApprovalsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = listApprovalsQuerySchema.parse(request.query);
  return agentsService.listApprovals(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
    query.status,
  );
}

export async function decideApprovalHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { id } = uuidParamSchema.parse(request.params);
  const input = decideApprovalSchema.parse(request.body);
  return agentsService.decideApproval(schemaName, userId, role, id, input);
}

export async function listRunsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = listRunsQuerySchema.parse(request.query);
  return agentsService.listRuns(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
    { agentId: query.agentId, taskId: query.taskId },
  );
}

export async function getRunHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { runId } = runIdParamSchema.parse(request.params);
  return agentsService.getRun(schemaName, userId, role, runId);
}

export async function getLiveDashboardHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  return agentsService.getLiveDashboard(schemaName, userId, role);
}

export async function searchHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = searchQuerySchema.parse(request.query);
  return agentsService.search(
    schemaName,
    userId,
    role,
    query.q,
    query.limit,
  );
}

export async function listActivityHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = listActivityQuerySchema.parse(request.query);
  return agentsService.listActivity(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
    {
      agentId: query.agentId,
      entityType: query.entityType,
      entityId: query.entityId,
    },
  );
}
