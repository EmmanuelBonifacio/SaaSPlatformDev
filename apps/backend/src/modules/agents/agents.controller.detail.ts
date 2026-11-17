import type { FastifyReply, FastifyRequest } from "fastify";
import { AgentsModuleError } from "./agents.errors";
import {
  agentIdParamSchema,
  createSecretRefSchema,
  secretRefIdParamSchema,
  updateBudgetSchema,
  upsertToolSchema,
} from "./agents.schema";
import { agentsDetailService } from "./agents.service.detail";
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

export async function listSecretRefsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  return agentsDetailService.listSecretRefs(schemaName, userId, role, agentId);
}

export async function createSecretRefHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  const input = createSecretRefSchema.parse(request.body);
  const row = await agentsDetailService.createSecretRef(
    schemaName,
    userId,
    role,
    agentId,
    input,
  );
  return reply.code(201).send(row);
}

export async function deleteSecretRefHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { agentId, secretId } = secretRefIdParamSchema.parse(request.params);
  await agentsDetailService.deleteSecretRef(
    schemaName,
    userId,
    role,
    agentId,
    secretId,
  );
  return reply.code(204).send();
}

export async function listToolsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  return agentsDetailService.listTools(schemaName, userId, role, agentId);
}

export async function upsertToolHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  const input = upsertToolSchema.parse(request.body);
  return agentsDetailService.upsertTool(
    schemaName,
    userId,
    role,
    agentId,
    input,
  );
}

export async function getBudgetHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  return agentsDetailService.getBudget(schemaName, userId, role, agentId);
}

export async function updateBudgetHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { agentId } = agentIdParamSchema.parse(request.params);
  const input = updateBudgetSchema.parse(request.body);
  return agentsDetailService.updateBudget(
    schemaName,
    userId,
    role,
    agentId,
    input,
  );
}
