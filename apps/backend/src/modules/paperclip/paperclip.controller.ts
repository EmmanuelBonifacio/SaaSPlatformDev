import type { FastifyRequest } from "fastify";
import {
  conversationParamsSchema,
  createConversationSchema,
  listTasksQuerySchema,
  sendMessageSchema,
} from "./paperclip.schema";
import { paperclipService } from "./paperclip.service";

function getTenant(request: FastifyRequest) {
  if (!request.tenant) {
    throw new Error("O contexto do tenant não foi inicializado.");
  }
  return request.tenant;
}

export async function listAgentsHandler(request: FastifyRequest) {
  return paperclipService.listAgents(getTenant(request));
}

export async function listTasksHandler(request: FastifyRequest) {
  const query = listTasksQuerySchema.parse(request.query);
  return paperclipService.listTasks(
    getTenant(request),
    request.user.sub,
    query,
  );
}

export async function listConversationsHandler(request: FastifyRequest) {
  return paperclipService.listConversations(
    getTenant(request),
    request.user.sub,
  );
}

export async function createConversationHandler(request: FastifyRequest) {
  const input = createConversationSchema.parse(request.body);
  return paperclipService.createConversation(
    getTenant(request),
    request.user.sub,
    input,
  );
}

export async function getMessagesHandler(request: FastifyRequest) {
  const params = conversationParamsSchema.parse(request.params);
  return paperclipService.getMessages(
    getTenant(request),
    request.user.sub,
    params.conversationId,
  );
}

export async function sendMessageHandler(request: FastifyRequest) {
  const params = conversationParamsSchema.parse(request.params);
  const input = sendMessageSchema.parse(request.body);
  return paperclipService.sendMessage(
    getTenant(request),
    request.user.sub,
    params.conversationId,
    input,
  );
}
