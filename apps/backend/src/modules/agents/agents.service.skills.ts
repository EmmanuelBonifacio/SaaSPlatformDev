import { AgentsModuleError } from "./agents.errors";
import { isTenantAdmin } from "./agents.permissions";
import * as repo from "./agents.repository";
import type {
  AttachSkillDto,
  CreateSkillDto,
  UpdateSkillDto,
} from "./agents.schema";
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

export async function listSkills(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  void role;
  return repo.listSkills(schemaName, limit, offset);
}

export async function getSkill(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  skillId: string,
) {
  await requireActor(schemaName, userId);
  void role;
  const skill = await repo.getSkill(schemaName, skillId);
  if (!skill) throw new AgentsModuleError(404, "Skill não encontrada.");
  return skill;
}

export async function createSkill(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  input: CreateSkillDto,
) {
  const actor = await requireActor(schemaName, userId);
  void role;
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode criar skills.");
  }
  return repo.createSkill(schemaName, userId, input);
}

export async function updateSkill(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  skillId: string,
  input: UpdateSkillDto,
) {
  const actor = await requireActor(schemaName, userId);
  void role;
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode atualizar skills.");
  }
  return repo.updateSkill(schemaName, userId, skillId, input);
}

export async function listSkillAttachments(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  skillId: string,
) {
  await getSkill(schemaName, userId, role, skillId);
  return repo.listSkillAttachments(schemaName, skillId);
}

export async function attachSkill(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  skillId: string,
  input: AttachSkillDto,
) {
  const actor = await requireActor(schemaName, userId);
  void role;
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode anexar skills.");
  }
  return repo.attachSkill(schemaName, userId, skillId, input.agentId);
}

export async function detachSkill(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  skillId: string,
  agentId: string,
) {
  const actor = await requireActor(schemaName, userId);
  void role;
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode desanexar skills.");
  }
  await repo.detachSkill(schemaName, userId, skillId, agentId);
}
