import type { FastifyInstance } from "fastify";
import { prisma } from "../../core/database/prisma";
import { recoverTenantRuns } from "./agents.runner";

const RECOVERY_INTERVAL_MS = 30_000;

/**
 * Recupera runs queued (sem approval pendente) e falha runs running sem heartbeat.
 */
export function registerAgentsRunnerRecovery(app: FastifyInstance): void {
  let running = false;

  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, schemaName: true },
      });
      let enqueued = 0;
      let staleFailed = 0;
      let failedTenants = 0;
      for (const tenant of tenants) {
        try {
          const result = await recoverTenantRuns(tenant.schemaName);
          enqueued += result.enqueued;
          staleFailed += result.staleFailed;
        } catch (error) {
          failedTenants += 1;
          app.log.error(
            {
              tenantId: tenant.id,
              errorType: error instanceof Error ? error.name : "UnknownError",
            },
            "Falha na recuperação do runner de agentes.",
          );
        }
      }
      if (enqueued > 0 || staleFailed > 0 || failedTenants > 0) {
        app.log.info(
          { enqueued, staleFailed, failedTenants },
          "Recuperação do runner de agentes concluída.",
        );
      }
    } catch (error) {
      app.log.error(
        {
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Não foi possível varrer tenants para o runner de agentes.",
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, RECOVERY_INTERVAL_MS);
  timer.unref();
  app.addHook("onClose", async () => {
    clearInterval(timer);
  });
}
