import type { FastifyReply, FastifyRequest } from "fastify";
import { AgentsModuleError } from "./agents.errors";
import { paginationSchema } from "./agents.schema";
import * as workService from "./agents.service.work";
import {
  createArtifactSchema,
  createCaseSchema,
  createGoalSchema,
  createProjectSchema,
  createRoutineSchema,
  createWorkspaceSchema,
  updateArtifactSchema,
  updateCaseSchema,
  updateGoalSchema,
  updateProjectSchema,
  updateRoutineSchema,
  updateWorkspaceSchema,
  workIdParamSchema,
} from "./agents.work.schema";
import type { ActorRole } from "./agents.types";
import { z } from "zod";

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

const artifactsQuerySchema = paginationSchema.extend({
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export async function listProjectsHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const q = paginationSchema.parse(request.query);
  return workService.listProjects(schemaName, userId, q.limit, q.offset);
}

export async function createProjectHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId } = context(request);
  const input = createProjectSchema.parse(request.body);
  const row = await workService.createProject(schemaName, userId, input);
  return reply.code(201).send(row);
}

export async function updateProjectHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const { id } = workIdParamSchema.parse(request.params);
  const input = updateProjectSchema.parse(request.body);
  return workService.updateProject(schemaName, userId, id, input);
}

export async function listRoutinesHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const q = paginationSchema.parse(request.query);
  return workService.listRoutines(schemaName, userId, q.limit, q.offset);
}

export async function createRoutineHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId } = context(request);
  const input = createRoutineSchema.parse(request.body);
  const row = await workService.createRoutine(schemaName, userId, input);
  return reply.code(201).send(row);
}

export async function updateRoutineHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const { id } = workIdParamSchema.parse(request.params);
  const input = updateRoutineSchema.parse(request.body);
  return workService.updateRoutine(schemaName, userId, id, input);
}

export async function listGoalsHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const q = paginationSchema.parse(request.query);
  return workService.listGoals(schemaName, userId, q.limit, q.offset);
}

export async function createGoalHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId } = context(request);
  const input = createGoalSchema.parse(request.body);
  const row = await workService.createGoal(schemaName, userId, input);
  return reply.code(201).send(row);
}

export async function updateGoalHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const { id } = workIdParamSchema.parse(request.params);
  const input = updateGoalSchema.parse(request.body);
  return workService.updateGoal(schemaName, userId, id, input);
}

export async function listArtifactsHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const q = artifactsQuerySchema.parse(request.query);
  return workService.listArtifacts(schemaName, userId, q.limit, q.offset, {
    taskId: q.taskId,
    projectId: q.projectId,
  });
}

export async function createArtifactHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId } = context(request);
  const input = createArtifactSchema.parse(request.body);
  const row = await workService.createArtifact(schemaName, userId, input);
  return reply.code(201).send(row);
}

export async function updateArtifactHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const { id } = workIdParamSchema.parse(request.params);
  const input = updateArtifactSchema.parse(request.body);
  return workService.updateArtifact(schemaName, userId, id, input);
}

export async function listCasesHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const q = paginationSchema.parse(request.query);
  return workService.listCases(schemaName, userId, q.limit, q.offset);
}

export async function createCaseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId } = context(request);
  const input = createCaseSchema.parse(request.body);
  const row = await workService.createCase(schemaName, userId, input);
  return reply.code(201).send(row);
}

export async function updateCaseHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const { id } = workIdParamSchema.parse(request.params);
  const input = updateCaseSchema.parse(request.body);
  return workService.updateCase(schemaName, userId, id, input);
}

export async function listWorkspacesHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const q = paginationSchema.parse(request.query);
  return workService.listWorkspaces(schemaName, userId, q.limit, q.offset);
}

export async function createWorkspaceHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId } = context(request);
  const input = createWorkspaceSchema.parse(request.body);
  const row = await workService.createWorkspace(schemaName, userId, input);
  return reply.code(201).send(row);
}

export async function updateWorkspaceHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  const { id } = workIdParamSchema.parse(request.params);
  const input = updateWorkspaceSchema.parse(request.body);
  return workService.updateWorkspace(schemaName, userId, id, input);
}
