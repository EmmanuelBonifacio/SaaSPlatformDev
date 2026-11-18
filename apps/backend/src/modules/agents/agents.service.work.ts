import { AgentsModuleError } from "./agents.errors";
import { isTenantAdmin } from "./agents.permissions";
import * as repo from "./agents.repository";
import * as casesWsRepo from "./agents.repository.cases-workspaces";
import * as workRepo from "./agents.repository.work";
import type {
  CreateArtifactDto,
  CreateCaseDto,
  CreateGoalDto,
  CreateProjectDto,
  CreateRoutineDto,
  CreateWorkspaceDto,
  UpdateArtifactDto,
  UpdateCaseDto,
  UpdateGoalDto,
  UpdateProjectDto,
  UpdateRoutineDto,
  UpdateWorkspaceDto,
} from "./agents.work.schema";
import type { AgentsActor } from "./agents.types";

async function requireActor(
  schemaName: string,
  userId: string,
): Promise<AgentsActor> {
  const dbRole = await repo.getActiveUserRole(schemaName, userId);
  if (!dbRole) {
    throw new AgentsModuleError(401, "Usuário autenticado não está ativo.");
  }
  return { userId, role: dbRole };
}

async function requireAdmin(
  schemaName: string,
  userId: string,
): Promise<AgentsActor> {
  const actor = await requireActor(schemaName, userId);
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode alterar este recurso.");
  }
  return actor;
}

export async function listProjects(
  schemaName: string,
  userId: string,
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  return workRepo.listProjects(schemaName, limit, offset);
}

export async function createProject(
  schemaName: string,
  userId: string,
  input: CreateProjectDto,
) {
  await requireAdmin(schemaName, userId);
  return workRepo.createProject(schemaName, userId, input);
}

export async function updateProject(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateProjectDto,
) {
  await requireAdmin(schemaName, userId);
  return workRepo.updateProject(schemaName, userId, id, input);
}

export async function listRoutines(
  schemaName: string,
  userId: string,
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  return workRepo.listRoutines(schemaName, limit, offset);
}

export async function createRoutine(
  schemaName: string,
  userId: string,
  input: CreateRoutineDto,
) {
  await requireAdmin(schemaName, userId);
  return workRepo.createRoutine(schemaName, userId, input);
}

export async function updateRoutine(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateRoutineDto,
) {
  await requireAdmin(schemaName, userId);
  return workRepo.updateRoutine(schemaName, userId, id, input);
}

export async function listGoals(
  schemaName: string,
  userId: string,
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  return workRepo.listGoals(schemaName, limit, offset);
}

export async function createGoal(
  schemaName: string,
  userId: string,
  input: CreateGoalDto,
) {
  await requireAdmin(schemaName, userId);
  return workRepo.createGoal(schemaName, userId, input);
}

export async function updateGoal(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateGoalDto,
) {
  await requireAdmin(schemaName, userId);
  return workRepo.updateGoal(schemaName, userId, id, input);
}

export async function listArtifacts(
  schemaName: string,
  userId: string,
  limit: number,
  offset: number,
  filters: { taskId?: string; projectId?: string } = {},
) {
  await requireActor(schemaName, userId);
  return workRepo.listArtifacts(schemaName, limit, offset, filters);
}

export async function createArtifact(
  schemaName: string,
  userId: string,
  input: CreateArtifactDto,
) {
  await requireActor(schemaName, userId);
  return workRepo.createArtifact(schemaName, userId, input);
}

export async function updateArtifact(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateArtifactDto,
) {
  await requireActor(schemaName, userId);
  return workRepo.updateArtifact(schemaName, userId, id, input);
}

export async function listCases(
  schemaName: string,
  userId: string,
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  return casesWsRepo.listCases(schemaName, limit, offset);
}

export async function createCase(
  schemaName: string,
  userId: string,
  input: CreateCaseDto,
) {
  await requireAdmin(schemaName, userId);
  return casesWsRepo.createCase(schemaName, userId, input);
}

export async function updateCase(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateCaseDto,
) {
  await requireAdmin(schemaName, userId);
  return casesWsRepo.updateCase(schemaName, userId, id, input);
}

export async function listWorkspaces(
  schemaName: string,
  userId: string,
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  return casesWsRepo.listWorkspaces(schemaName, limit, offset);
}

export async function createWorkspace(
  schemaName: string,
  userId: string,
  input: CreateWorkspaceDto,
) {
  await requireAdmin(schemaName, userId);
  return casesWsRepo.createWorkspace(schemaName, userId, input);
}

export async function updateWorkspace(
  schemaName: string,
  userId: string,
  id: string,
  input: UpdateWorkspaceDto,
) {
  await requireAdmin(schemaName, userId);
  return casesWsRepo.updateWorkspace(schemaName, userId, id, input);
}
