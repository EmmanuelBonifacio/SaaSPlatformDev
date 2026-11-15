import type { FastifyInstance } from "fastify";
import { prisma } from "../../core/database/prisma";
import { memoryService } from "./memory.service";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1_000;
const MAX_CLEANUP_BATCHES_PER_TENANT = 20;

export function registerMemoryCleanup(app: FastifyInstance): void {
  let running = false;

  const cleanup = async (): Promise<void> => {
    if (running) return;
    running = true;

    try {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, schemaName: true },
      });
      let expiredCount = 0;
      let failedTenantCount = 0;

      for (const tenant of tenants) {
        try {
          for (
            let batch = 0;
            batch < MAX_CLEANUP_BATCHES_PER_TENANT;
            batch += 1
          ) {
            const deleted = await memoryService.expirePending(
              tenant.schemaName,
            );
            expiredCount += deleted;
            if (deleted < 500) break;
          }
        } catch (error) {
          failedTenantCount += 1;
          app.log.error(
            {
              tenantId: tenant.id,
              errorType: error instanceof Error ? error.name : "UnknownError",
            },
            "Falha na expiração de rascunhos de memória.",
          );
        }
      }

      if (expiredCount > 0 || failedTenantCount > 0) {
        app.log.info(
          { expiredCount, failedTenantCount },
          "Rotina de expiração de memórias concluída.",
        );
      }
    } catch (error) {
      app.log.error(
        {
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Não foi possível iniciar a expiração de rascunhos de memória.",
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void cleanup();
  }, CLEANUP_INTERVAL_MS);
  timer.unref();
  app.addHook("onClose", async () => {
    clearInterval(timer);
  });
  void cleanup();
}
