import type { FastifyReply, FastifyRequest } from "fastify";
import { AgentsModuleError } from "./agents.errors";
import {
  attachSkillSchema,
  createSkillSchema,
  paginationSchema,
  publishSkillVersionSchema,
  skillAttachmentParamSchema,
  skillIdParamSchema,
  skillVersionParamSchema,
  updateSkillSchema,
} from "./agents.schema";
import * as skillsService from "./agents.service.skills";
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
  return { schemaName: request.tenant.schemaName, userId, role };
}

export async function listSkillsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = paginationSchema.parse(request.query);
  return skillsService.listSkills(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
  );
}

export async function getSkillHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { skillId } = skillIdParamSchema.parse(request.params);
  return skillsService.getSkill(schemaName, userId, role, skillId);
}

export async function createSkillHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const input = createSkillSchema.parse(request.body);
  const skill = await skillsService.createSkill(
    schemaName,
    userId,
    role,
    input,
  );
  return reply.code(201).send(skill);
}

export async function updateSkillHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { skillId } = skillIdParamSchema.parse(request.params);
  const input = updateSkillSchema.parse(request.body);
  return skillsService.updateSkill(schemaName, userId, role, skillId, input);
}

export async function listSkillAttachmentsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { skillId } = skillIdParamSchema.parse(request.params);
  return skillsService.listSkillAttachments(schemaName, userId, role, skillId);
}

export async function attachSkillHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { skillId } = skillIdParamSchema.parse(request.params);
  const input = attachSkillSchema.parse(request.body);
  const attachment = await skillsService.attachSkill(
    schemaName,
    userId,
    role,
    skillId,
    input,
  );
  return reply.code(201).send(attachment);
}

export async function detachSkillHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { skillId, agentId } = skillAttachmentParamSchema.parse(request.params);
  await skillsService.detachSkill(schemaName, userId, role, skillId, agentId);
  return reply.code(204).send();
}

export async function listSkillVersionsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { skillId } = skillIdParamSchema.parse(request.params);
  return skillsService.listSkillVersions(schemaName, userId, role, skillId);
}

export async function publishSkillVersionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const { skillId } = skillIdParamSchema.parse(request.params);
  const input = publishSkillVersionSchema.parse(request.body ?? {});
  const result = await skillsService.publishSkillVersion(
    schemaName,
    userId,
    role,
    skillId,
    input,
  );
  return reply.code(201).send(result);
}

export async function restoreSkillVersionHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { skillId, versionId } = skillVersionParamSchema.parse(request.params);
  return skillsService.restoreSkillVersion(
    schemaName,
    userId,
    role,
    skillId,
    versionId,
  );
}
