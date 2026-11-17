import { AgentsModuleError } from "./agents.errors";
import { isTenantAdmin } from "./agents.permissions";
import * as repo from "./agents.repository";
import type {
  CreateConnectorDto,
  UpdateConnectorDto,
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

export async function listConnectors(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  limit: number,
  offset: number,
) {
  await requireActor(schemaName, userId);
  void role;
  return repo.listConnectors(schemaName, limit, offset);
}

export async function getConnector(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  connectorId: string,
) {
  await requireActor(schemaName, userId);
  void role;
  const connector = await repo.getConnector(schemaName, connectorId);
  if (!connector) {
    throw new AgentsModuleError(404, "Connector não encontrado.");
  }
  return connector;
}

export async function createConnector(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  input: CreateConnectorDto,
) {
  const actor = await requireActor(schemaName, userId);
  void role;
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode criar connectors.");
  }
  return repo.createConnector(schemaName, userId, input);
}

export async function updateConnector(
  schemaName: string,
  userId: string,
  role: AgentsActor["role"],
  connectorId: string,
  input: UpdateConnectorDto,
) {
  const actor = await requireActor(schemaName, userId);
  void role;
  if (!isTenantAdmin(actor)) {
    throw new AgentsModuleError(403, "Somente admin pode atualizar connectors.");
  }
  return repo.updateConnector(schemaName, userId, connectorId, input);
}
