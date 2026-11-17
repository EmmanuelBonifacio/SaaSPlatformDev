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
  getLiveDashboardHandler,
  getRunHandler,
  getTaskHandler,
  listActivityHandler,
  listAgentsHandler,
  listApprovalsHandler,
  listCommentsHandler,
  listRunsHandler,
  listTasksHandler,
  updateAgentHandler,
  updateTaskHandler,
} from "./agents.controller";
import {
  createConnectorHandler,
  getConnectorHandler,
  listConnectorsHandler,
  updateConnectorHandler,
} from "./agents.controller.connectors";
import {
  attachSkillHandler,
  createSkillHandler,
  detachSkillHandler,
  getSkillHandler,
  listSkillAttachmentsHandler,
  listSkillsHandler,
  updateSkillHandler,
} from "./agents.controller.skills";

/**
 * API nativa de agentes (SP-7). Prefixo: /agents.
 * Catálogo: requireModule("agents").
 * Rotas estáticas (/tasks, /approvals) antes de /:agentId.
 */
export async function agentsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", tenantMiddleware);
    protectedRoutes.addHook("preHandler", requireModule("agents"));

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

    protectedRoutes.get("/live", getLiveDashboardHandler);
    protectedRoutes.get("/runs", listRunsHandler);
    protectedRoutes.get("/runs/:runId", getRunHandler);
    protectedRoutes.get("/activity", listActivityHandler);

    protectedRoutes.get("/skills", listSkillsHandler);
    protectedRoutes.post(
      "/skills",
      { preHandler: [requireRole("admin")] },
      createSkillHandler,
    );
    protectedRoutes.get("/skills/:skillId", getSkillHandler);
    protectedRoutes.patch(
      "/skills/:skillId",
      { preHandler: [requireRole("admin")] },
      updateSkillHandler,
    );
    protectedRoutes.get(
      "/skills/:skillId/attachments",
      listSkillAttachmentsHandler,
    );
    protectedRoutes.post(
      "/skills/:skillId/attachments",
      { preHandler: [requireRole("admin")] },
      attachSkillHandler,
    );
    protectedRoutes.delete(
      "/skills/:skillId/attachments/:agentId",
      { preHandler: [requireRole("admin")] },
      detachSkillHandler,
    );

    protectedRoutes.get("/connectors", listConnectorsHandler);
    protectedRoutes.post(
      "/connectors",
      { preHandler: [requireRole("admin")] },
      createConnectorHandler,
    );
    protectedRoutes.get("/connectors/:connectorId", getConnectorHandler);
    protectedRoutes.patch(
      "/connectors/:connectorId",
      { preHandler: [requireRole("admin")] },
      updateConnectorHandler,
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
