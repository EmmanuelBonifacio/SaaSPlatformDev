import type { FastifyInstance } from "fastify";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import {
  getClientHandler,
  listClientsHandler,
  upsertClientHandler,
} from "./clients.controller";

export async function clientsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", tenantMiddleware);

    protectedRoutes.get("/", listClientsHandler);
    protectedRoutes.get("/:clientId", getClientHandler);
    protectedRoutes.post("/upsert", upsertClientHandler);
  });
}
