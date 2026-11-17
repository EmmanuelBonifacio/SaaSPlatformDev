import type { FastifyRequest } from "fastify";
import { AgentsModuleError } from "./agents.errors";
import * as orgCostsService from "./agents.service.org-costs";

function context(request: FastifyRequest) {
  if (!request.tenant) {
    throw new AgentsModuleError(401, "Contexto autenticado do tenant ausente.");
  }
  const userId = request.user?.sub;
  if (!userId || typeof userId !== "string") {
    throw new AgentsModuleError(401, "Identidade autenticada inválida.");
  }
  return { schemaName: request.tenant.schemaName, userId };
}

export async function getOrgChartHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  return orgCostsService.getOrgChart(schemaName, userId);
}

export async function getCostsHandler(request: FastifyRequest) {
  const { schemaName, userId } = context(request);
  return orgCostsService.getCosts(schemaName, userId);
}
