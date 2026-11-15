import type { FastifyInstance } from "fastify";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import {
  createCandidateHandler,
  deleteMemoryHandler,
  getMemorySettingsHandler,
  listCandidatesHandler,
  listMemoriesHandler,
  reviewCandidateHandler,
  searchMemoriesHandler,
  updateMemorySettingsHandler,
} from "./memory.controller";

export async function memoryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", tenantMiddleware);

    protectedRoutes.get("/entries", listMemoriesHandler);
    protectedRoutes.get("/search", searchMemoriesHandler);
    protectedRoutes.delete("/entries/:memoryId", deleteMemoryHandler);
    protectedRoutes.get("/candidates", listCandidatesHandler);
    protectedRoutes.post("/candidates", createCandidateHandler);
    protectedRoutes.post(
      "/candidates/:memoryId/review",
      reviewCandidateHandler,
    );
    protectedRoutes.get("/settings", getMemorySettingsHandler);
    protectedRoutes.patch("/settings", updateMemorySettingsHandler);
  });
}
