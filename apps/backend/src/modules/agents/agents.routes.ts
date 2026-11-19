import type { FastifyInstance } from "fastify";
import { requireModule } from "../../core/middleware/module.middleware";
import { requireRole } from "../../core/middleware/role.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import {
  addCommentReceiptHandler,
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
  searchHandler,
  updateAgentHandler,
  updateTaskHandler,
  uploadCommentAttachmentHandler,
} from "./agents.controller";
import {
  completeConnectorOauthHandler,
  createConnectorHandler,
  disconnectConnectorOauthHandler,
  getConnectorHandler,
  getConnectorOauthTokenStatusHandler,
  listConnectorsHandler,
  listMcpGatewaysHandler,
  refreshConnectorOauthHandler,
  startConnectorOauthHandler,
  updateConnectorHandler,
} from "./agents.controller.connectors";
import {
  attachSkillHandler,
  createSkillHandler,
  detachSkillHandler,
  getSkillHandler,
  listSkillAttachmentsHandler,
  listSkillVersionsHandler,
  listSkillsHandler,
  publishSkillVersionHandler,
  restoreSkillVersionHandler,
  updateSkillHandler,
} from "./agents.controller.skills";
import {
  createSecretRefHandler,
  deleteSecretRefHandler,
  getBudgetHandler,
  listSecretRefsHandler,
  listToolsHandler,
  rotateSecretValueHandler,
  updateBudgetHandler,
  upsertToolHandler,
} from "./agents.controller.detail";
import {
  createArtifactHandler,
  createCaseHandler,
  createGoalHandler,
  createProjectHandler,
  createRoutineHandler,
  createWorkspaceHandler,
  listArtifactsHandler,
  listCasesHandler,
  listGoalsHandler,
  listProjectsHandler,
  listRoutinesHandler,
  listWorkspacesHandler,
  updateArtifactHandler,
  updateCaseHandler,
  updateGoalHandler,
  updateProjectHandler,
  updateRoutineHandler,
  updateWorkspaceHandler,
} from "./agents.controller.work";
import {
  getCostsHandler,
  getOrgChartHandler,
} from "./agents.controller.org-costs";

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
    protectedRoutes.post(
      "/tasks/:taskId/comments/:commentId/attachments",
      uploadCommentAttachmentHandler,
    );
    protectedRoutes.post(
      "/tasks/:taskId/comments/:commentId/receipts",
      addCommentReceiptHandler,
    );

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
    protectedRoutes.get("/search", searchHandler);
    protectedRoutes.get("/org", getOrgChartHandler);
    protectedRoutes.get("/costs", getCostsHandler);
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
    protectedRoutes.get(
      "/skills/:skillId/versions",
      listSkillVersionsHandler,
    );
    protectedRoutes.post(
      "/skills/:skillId/versions",
      { preHandler: [requireRole("admin")] },
      publishSkillVersionHandler,
    );
    protectedRoutes.post(
      "/skills/:skillId/versions/:versionId/restore",
      { preHandler: [requireRole("admin")] },
      restoreSkillVersionHandler,
    );

    protectedRoutes.get("/connectors", listConnectorsHandler);
    protectedRoutes.get("/connectors/gateways", listMcpGatewaysHandler);
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
    protectedRoutes.post(
      "/connectors/:connectorId/oauth/start",
      { preHandler: [requireRole("admin")] },
      startConnectorOauthHandler,
    );
    protectedRoutes.post(
      "/connectors/:connectorId/oauth/complete",
      { preHandler: [requireRole("admin")] },
      completeConnectorOauthHandler,
    );
    protectedRoutes.post(
      "/connectors/:connectorId/oauth/disconnect",
      { preHandler: [requireRole("admin")] },
      disconnectConnectorOauthHandler,
    );
    protectedRoutes.get(
      "/connectors/:connectorId/oauth/tokens",
      getConnectorOauthTokenStatusHandler,
    );
    protectedRoutes.post(
      "/connectors/:connectorId/oauth/refresh",
      { preHandler: [requireRole("admin")] },
      refreshConnectorOauthHandler,
    );

    protectedRoutes.get("/projects", listProjectsHandler);
    protectedRoutes.post(
      "/projects",
      { preHandler: [requireRole("admin")] },
      createProjectHandler,
    );
    protectedRoutes.patch(
      "/projects/:id",
      { preHandler: [requireRole("admin")] },
      updateProjectHandler,
    );

    protectedRoutes.get("/routines", listRoutinesHandler);
    protectedRoutes.post(
      "/routines",
      { preHandler: [requireRole("admin")] },
      createRoutineHandler,
    );
    protectedRoutes.patch(
      "/routines/:id",
      { preHandler: [requireRole("admin")] },
      updateRoutineHandler,
    );

    protectedRoutes.get("/goals", listGoalsHandler);
    protectedRoutes.post(
      "/goals",
      { preHandler: [requireRole("admin")] },
      createGoalHandler,
    );
    protectedRoutes.patch(
      "/goals/:id",
      { preHandler: [requireRole("admin")] },
      updateGoalHandler,
    );

    protectedRoutes.get("/artifacts", listArtifactsHandler);
    protectedRoutes.post("/artifacts", createArtifactHandler);
    protectedRoutes.patch("/artifacts/:id", updateArtifactHandler);

    protectedRoutes.get("/cases", listCasesHandler);
    protectedRoutes.post(
      "/cases",
      { preHandler: [requireRole("admin")] },
      createCaseHandler,
    );
    protectedRoutes.patch(
      "/cases/:id",
      { preHandler: [requireRole("admin")] },
      updateCaseHandler,
    );

    protectedRoutes.get("/workspaces", listWorkspacesHandler);
    protectedRoutes.post(
      "/workspaces",
      { preHandler: [requireRole("admin")] },
      createWorkspaceHandler,
    );
    protectedRoutes.patch(
      "/workspaces/:id",
      { preHandler: [requireRole("admin")] },
      updateWorkspaceHandler,
    );

    protectedRoutes.get("/:agentId", getAgentHandler);
    protectedRoutes.patch(
      "/:agentId",
      { preHandler: [requireRole("admin")] },
      updateAgentHandler,
    );
    protectedRoutes.post("/:agentId/runs", createRunHandler);

    protectedRoutes.get("/:agentId/secrets", listSecretRefsHandler);
    protectedRoutes.post(
      "/:agentId/secrets",
      { preHandler: [requireRole("admin")] },
      createSecretRefHandler,
    );
    protectedRoutes.patch(
      "/:agentId/secrets/:secretId",
      { preHandler: [requireRole("admin")] },
      rotateSecretValueHandler,
    );
    protectedRoutes.delete(
      "/:agentId/secrets/:secretId",
      { preHandler: [requireRole("admin")] },
      deleteSecretRefHandler,
    );

    protectedRoutes.get("/:agentId/tools", listToolsHandler);
    protectedRoutes.put(
      "/:agentId/tools",
      { preHandler: [requireRole("admin")] },
      upsertToolHandler,
    );

    protectedRoutes.get("/:agentId/budgets", getBudgetHandler);
    protectedRoutes.patch(
      "/:agentId/budgets",
      { preHandler: [requireRole("admin")] },
      updateBudgetHandler,
    );
  });
}
