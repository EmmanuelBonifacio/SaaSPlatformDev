import type { FastifyReply, FastifyRequest } from "fastify";
import { AgentsModuleError } from "./agents.errors";
import {
  connectorIdParamSchema,
  createConnectorSchema,
  oauthCompleteSchema,
  oauthRefreshSchema,
  paginationSchema,
  updateConnectorSchema,
} from "./agents.schema";
import * as connectorsService from "./agents.service.connectors";
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

export async function listConnectorsHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const query = paginationSchema.parse(request.query);
  return connectorsService.listConnectors(
    schemaName,
    userId,
    role,
    query.limit,
    query.offset,
  );
}

export async function getConnectorHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  return connectorsService.getConnector(
    schemaName,
    userId,
    role,
    connectorId,
  );
}

export async function createConnectorHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, userId, role } = context(request);
  const input = createConnectorSchema.parse(request.body);
  const connector = await connectorsService.createConnector(
    schemaName,
    userId,
    role,
    input,
  );
  return reply.code(201).send(connector);
}

export async function updateConnectorHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  const input = updateConnectorSchema.parse(request.body);
  return connectorsService.updateConnector(
    schemaName,
    userId,
    role,
    connectorId,
    input,
  );
}

export async function listMcpGatewaysHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  return connectorsService.listMcpGateways(schemaName, userId, role);
}

export async function startConnectorOauthHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  return connectorsService.startConnectorOauth(
    schemaName,
    userId,
    role,
    connectorId,
  );
}

export async function completeConnectorOauthHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  const input = oauthCompleteSchema.parse(request.body ?? {});
  return connectorsService.completeConnectorOauth(
    schemaName,
    userId,
    role,
    connectorId,
    input,
  );
}

export async function disconnectConnectorOauthHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  return connectorsService.disconnectConnectorOauth(
    schemaName,
    userId,
    role,
    connectorId,
  );
}

export async function getConnectorOauthTokenStatusHandler(
  request: FastifyRequest,
) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  return connectorsService.getConnectorOauthTokenStatus(
    schemaName,
    userId,
    role,
    connectorId,
  );
}

export async function refreshConnectorOauthHandler(request: FastifyRequest) {
  const { schemaName, userId, role } = context(request);
  const { connectorId } = connectorIdParamSchema.parse(request.params);
  const input = oauthRefreshSchema.parse(request.body ?? {});
  return connectorsService.refreshConnectorOauth(
    schemaName,
    userId,
    role,
    connectorId,
    input,
  );
}
