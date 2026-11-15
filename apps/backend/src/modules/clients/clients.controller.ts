import type { FastifyReply, FastifyRequest } from "fastify";
import { ClientsModuleError } from "./clients.errors";
import {
  authenticatedUserIdSchema,
  clientIdParamsSchema,
  listClientsSchema,
  upsertClientSchema,
} from "./clients.schema";
import { clientsService } from "./clients.service";
import type { ClientActor } from "./clients.types";

function getActor(request: FastifyRequest): {
  schemaName: string;
  actor: ClientActor;
} {
  if (!request.tenant) {
    throw new ClientsModuleError(401, "Contexto autenticado do tenant ausente.");
  }
  const userId = authenticatedUserIdSchema.safeParse(request.user.sub);
  if (!userId.success) {
    throw new ClientsModuleError(401, "Identidade autenticada inválida.");
  }
  return {
    schemaName: request.tenant.schemaName,
    actor: { userId: userId.data },
  };
}

export async function listClientsHandler(request: FastifyRequest) {
  const { schemaName, actor } = getActor(request);
  return clientsService.list(
    schemaName,
    actor,
    listClientsSchema.parse(request.query),
  );
}

export async function getClientHandler(request: FastifyRequest) {
  const { schemaName, actor } = getActor(request);
  const { clientId } = clientIdParamsSchema.parse(request.params);
  return clientsService.get(schemaName, actor, clientId);
}

export async function upsertClientHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { schemaName, actor } = getActor(request);
  const input = upsertClientSchema.parse(request.body);
  const result = await clientsService.upsert(schemaName, actor, input);
  return reply.code(result.created ? 201 : 200).send(result);
}
