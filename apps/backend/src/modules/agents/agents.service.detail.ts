import { AgentsModuleError } from "./agents.errors";
import { isTenantAdmin } from "./agents.permissions";
import * as detailRepo from "./agents.repository.detail";
import * as repo from "./agents.repository";
import type {
  CreateSecretRefDto,
  RotateSecretValueDto,
  UpdateBudgetDto,
  UpsertToolDto,
} from "./agents.schema";
import type { AgentsActor } from "./agents.types";

async function requireActor(
  schemaName: string,
  userId: string,
  _roleHint: AgentsActor["role"],
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
  role: AgentsActor["role"],
): Promise<AgentsActor> {
  const actor = await requireActor(schemaName, userId, role);
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode alterar este recurso.");
  }
  return actor;
}

export class AgentsDetailService {
  async listSecretRefs(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
  ) {
    await requireActor(schemaName, userId, role);
    return detailRepo.listSecretRefs(schemaName, agentId);
  }

  async createSecretRef(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    input: CreateSecretRefDto,
  ) {
    await requireAdmin(schemaName, userId, role);
    return detailRepo.createSecretRef(schemaName, userId, agentId, input);
  }

  async rotateSecretValue(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    secretId: string,
    input: RotateSecretValueDto,
  ) {
    await requireAdmin(schemaName, userId, role);
    return detailRepo.rotateSecretValue(
      schemaName,
      userId,
      agentId,
      secretId,
      input,
    );
  }

  async deleteSecretRef(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    secretId: string,
  ) {
    await requireAdmin(schemaName, userId, role);
    return detailRepo.deleteSecretRef(schemaName, userId, agentId, secretId);
  }

  async listTools(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
  ) {
    await requireActor(schemaName, userId, role);
    return detailRepo.listTools(schemaName, agentId);
  }

  async upsertTool(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    input: UpsertToolDto,
  ) {
    await requireAdmin(schemaName, userId, role);
    return detailRepo.upsertTool(schemaName, userId, agentId, input);
  }

  async getBudget(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
  ) {
    await requireActor(schemaName, userId, role);
    return detailRepo.getBudget(schemaName, agentId);
  }

  async updateBudget(
    schemaName: string,
    userId: string,
    role: AgentsActor["role"],
    agentId: string,
    input: UpdateBudgetDto,
  ) {
    await requireAdmin(schemaName, userId, role);
    return detailRepo.updateBudget(schemaName, userId, agentId, input);
  }
}

export const agentsDetailService = new AgentsDetailService();
