import { AgentsModuleError } from "./agents.errors";
import * as repo from "./agents.repository";
import {
  buildOrgTree,
  getCostsSummary,
  listOrgAgents,
  type CostsSummary,
  type OrgNode,
} from "./agents.repository.org-costs";

async function requireActor(schemaName: string, userId: string) {
  const dbRole = await repo.getActiveUserRole(schemaName, userId);
  if (!dbRole) {
    throw new AgentsModuleError(401, "Usuário autenticado não está ativo.");
  }
}

export async function getOrgChart(
  schemaName: string,
  userId: string,
): Promise<{ agents: OrgNode[]; flat: Awaited<ReturnType<typeof listOrgAgents>> }> {
  await requireActor(schemaName, userId);
  const flat = await listOrgAgents(schemaName);
  return { agents: buildOrgTree(flat), flat };
}

export async function getCosts(
  schemaName: string,
  userId: string,
): Promise<CostsSummary> {
  await requireActor(schemaName, userId);
  return getCostsSummary(schemaName);
}
