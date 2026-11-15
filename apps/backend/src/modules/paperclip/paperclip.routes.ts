import type { FastifyInstance } from "fastify";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import { requireModule } from "../../core/middleware/module.middleware";
import {
  createConversationHandler,
  getMessagesHandler,
  listAgentsHandler,
  listConversationsHandler,
  listTasksHandler,
  sendMessageHandler,
} from "./paperclip.controller";

export async function paperclipRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", tenantMiddleware);
    protectedRoutes.addHook("preHandler", requireModule("paperclip"));

    protectedRoutes.get("/agents", listAgentsHandler);
    protectedRoutes.get("/tasks", listTasksHandler);
    protectedRoutes.get("/conversations", listConversationsHandler);
    protectedRoutes.post("/conversations", createConversationHandler);
    protectedRoutes.get(
      "/conversations/:conversationId/messages",
      getMessagesHandler,
    );
    protectedRoutes.post(
      "/conversations/:conversationId/messages",
      sendMessageHandler,
    );
  });
}
