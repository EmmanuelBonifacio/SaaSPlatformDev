import type { FastifyInstance } from "fastify";
import cron from "node-cron";
import { prisma } from "../../core/database/prisma";
import { recoverTenantRuns } from "./agents.runner";
import { dispatchTenantRoutines } from "./agents.routines.dispatcher";

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

/**
 * SP-42 — a cada minuto UTC, dispara routines ativas cujo cron casa.
 */
export function registerAgentsRoutineCron(app: FastifyInstance): void {
  let running = false;

  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    const now = new Date();
    try {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, schemaName: true },
      });
      let fired = 0;
      let woken = 0;
      let errors = 0;
      let failedTenants = 0;
      for (const tenant of tenants) {
        try {
          const result = await dispatchTenantRoutines(tenant.schemaName, now);
          fired += result.fired;
          woken += result.woken;
          errors += result.errors;
        } catch (error) {
          failedTenants += 1;
          app.log.error(
            {
              tenantId: tenant.id,
              errorType: error instanceof Error ? error.name : "UnknownError",
            },
            "Falha no dispatcher de routines.",
          );
        }
      }
      if (fired > 0 || woken > 0 || errors > 0 || failedTenants > 0) {
        app.log.info(
          { fired, woken, errors, failedTenants },
          "Dispatcher de routines concluído.",
        );
      }
    } catch (error) {
      app.log.error(
        {
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Não foi possível varrer tenants para routines.",
      );
    } finally {
      running = false;
    }
  };

  const task = cron.schedule(
    "* * * * *",
    () => {
      void tick();
    },
    { timezone: "UTC" },
  );
  task.start();
  app.addHook("onClose", async () => {
    task.stop();
  });
}
