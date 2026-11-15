import type { FastifyReply, FastifyRequest } from "fastify";
import { MemoryModuleError } from "./memory.errors";
import {
  authenticatedUserIdSchema,
  createMemoryCandidateSchema,
  listCandidatesSchema,
  listMemorySchema,
  memoryIdParamsSchema,
  reviewMemorySchema,
  searchMemorySchema,
  updateMemorySettingsSchema,
} from "./memory.schema";
import { memoryService } from "./memory.service";
import type { MemoryActor } from "./memory.types";

function getActor(request: FastifyRequest): {
  schemaName: string;
  actor: MemoryActor;
} {
  if (!request.tenant) {
    throw new MemoryModuleError(401, "Contexto autenticado do tenant ausente.");
  }
  const userId = authenticatedUserIdSchema.safeParse(request.user.sub);
  if (!userId.success) {
    throw new MemoryModuleError(401, "Identidade autenticada inválida.");
  }
  return {
    schemaName: request.tenant.schemaName,
    actor: { userId: userId.data },
  };
}

export async function listMemoriesHandler(request: FastifyRequest) {
  const { schemaName, actor } = getActor(request);
  return memoryService.list(
    schemaName,
    actor,
    listMemorySchema.parse(request.query),
  );
}

export async function searchMemoriesHandler(request: FastifyRequest) {
  const { schemaName, actor } = getActor(request);
  const input = searchMemorySchema.parse(request.query);
  return memoryService.list(schemaName, actor, {
    query: input.query,
    limit: input.limit,
    offset: 0,
  });
}

export async function listCandidatesHandler(request: FastifyRequest) {
  const { schemaName, actor } = getActor(request);
  const input = listCandidatesSchema.parse(request.query);
  return memoryService.candidates(schemaName, actor, input.limit);
}

export async function createCandidateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, actor } = getActor(request);
  const input = createMemoryCandidateSchema.parse(request.body);
  const candidate = await memoryService.createManualCandidate(
    schemaName,
    actor,
    input,
  );
  return reply.code(201).send(candidate);
}

export async function reviewCandidateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, actor } = getActor(request);
  const { memoryId } = memoryIdParamsSchema.parse(request.params);
  const { action } = reviewMemorySchema.parse(request.body);
  const result = await memoryService.review(
    schemaName,
    actor,
    memoryId,
    action,
  );
  return reply.code(200).send({ action, memory: result });
}

export async function deleteMemoryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, actor } = getActor(request);
  const { memoryId } = memoryIdParamsSchema.parse(request.params);
  await memoryService.remove(schemaName, actor, memoryId);
  return reply.code(204).send();
}

export async function getMemorySettingsHandler(request: FastifyRequest) {
  const { schemaName, actor } = getActor(request);
  return memoryService.getSettings(schemaName, actor.userId);
}

export async function updateMemorySettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, actor } = getActor(request);
  const { captureSuggestions } = updateMemorySettingsSchema.parse(request.body);
  await memoryService.setSettings(
    schemaName,
    actor.userId,
    captureSuggestions,
  );
  return reply.code(200).send({ captureSuggestions });
}
