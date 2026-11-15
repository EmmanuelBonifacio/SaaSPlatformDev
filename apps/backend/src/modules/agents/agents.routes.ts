import type { FastifyInstance } from "fastify";
import { requireModule } from "../../core/middleware/module.middleware";
import { requireRole } from "../../core/middleware/role.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import {
  createAgentHandler,
  createCommentHandler,
  createRunHandler,
  createTaskHandler,
  decideApprovalHandler,
  getAgentHandler,
  getTaskHandler,
  listAgentsHandler,
  listApprovalsHandler,
  listCommentsHandler,
  listTasksHandler,
  updateAgentHandler,
  updateTaskHandler,
} from "./agents.controller";

/**
 * API nativa V1 de agentes (SP-7 fase 3).
 * Prefixo: /agents. Módulo de catálogo: "paperclip" (rename na fase 5).
 * Rotas estáticas (/tasks, /approvals) antes de /:agentId.
 */
export async function agentsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", tenantMiddleware);
    protectedRoutes.addHook("preHandler", requireModule("paperclip"));

    protectedRoutes.get("/", listAgentsHandler);
    protectedRoutes.post(
      "/",
      { preHandler: [requireRole("admin")] },
      createAgentHandler,
    );

    protectedRoutes.get("/tasks", listTasksHandler);
    protectedRoutes.post("/tasks", createTaskHandler);
    protectedRoutes.get("/tasks/:taskId", getTaskHandler);
    protectedRoutes.patch("/tasks/:taskId", updateTaskHandler);
    protectedRoutes.get("/tasks/:taskId/comments", listCommentsHandler);
    protectedRoutes.post("/tasks/:taskId/comments", createCommentHandler);

    protectedRoutes.get(
      "/approvals",
      { preHandler: [requireRole("admin")] },
      listApprovalsHandler,
    );
    protectedRoutes.post(
      "/approvals/:id/decide",
      { preHandler: [requireRole("admin")] },
      decideApprovalHandler,
    );

    protectedRoutes.get("/:agentId", getAgentHandler);
    protectedRoutes.patch(
      "/:agentId",
      { preHandler: [requireRole("admin")] },
      updateAgentHandler,
    );
    protectedRoutes.post("/:agentId/runs", createRunHandler);
  });
}
