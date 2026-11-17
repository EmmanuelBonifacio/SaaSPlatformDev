/**
 * Runner in-process (SP-35): claim → budget → adapter → heartbeats → spend → finish.
 * Tenant-safe via withTenantSchema nos repositórios; sem secrets no código.
 */

import { resolveAdapter } from "./agents.adapters";
import * as runnerRepo from "./agents.repository.runner";

const inFlight = new Set<string>();

export function enqueueRunExecution(
  schemaName: string,
  runId: string,
): void {
  const key = `${schemaName}:${runId}`;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  setImmediate(() => {
    void executeRun(schemaName, runId).finally(() => {
      inFlight.delete(key);
    });
  });
}

export async function executeRun(
  schemaName: string,
  runId: string,
): Promise<void> {
  const claimed = await runnerRepo.claimQueuedRun(schemaName, runId);
  if (!claimed) return;

  const {
    run,
    agent,
    taskTitle,
    taskDescription,
    webhook,
    secretRefs,
    budget,
  } = claimed;
  const adapterType = agent.adapterType || run.adapterType || "stub";

  if (runnerRepo.isHardBudgetExceeded(budget)) {
    await runnerRepo.finishRun(schemaName, {
      runId: run.id,
      agentId: agent.id,
      taskId: run.taskId,
      ok: false,
      summary: "Budget hard limit atingido — run bloqueado.",
      errorMessage: "HardBudgetExceeded",
    });
    return;
  }

  const adapter = resolveAdapter(adapterType);

  try {
    const result = await adapter.execute(
      {
        schemaName,
        runId: run.id,
        agentId: agent.id,
        agentName: agent.name,
        adapterType,
        taskId: run.taskId,
        taskTitle,
        taskDescription,
        instructions: agent.instructions,
        harness: agent.harness ?? {},
        secretRefs,
        webhook: adapter.type === "http_webhook" ? webhook : null,
      },
      async (phase) => {
        await runnerRepo.touchHeartbeat(
          schemaName,
          run.id,
          agent.id,
          phase,
        );
      },
    );
    if (result.ok && result.spendCents && result.spendCents > 0) {
      await runnerRepo.recordRunSpend(schemaName, agent.id, result.spendCents);
    }
    await runnerRepo.finishRun(schemaName, {
      runId: run.id,
      agentId: agent.id,
      taskId: run.taskId,
      ok: result.ok,
      summary: result.summary,
      errorMessage: result.errorMessage ?? null,
      commentBody: result.commentBody,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "RunnerError";
    await runnerRepo.finishRun(schemaName, {
      runId: run.id,
      agentId: agent.id,
      taskId: run.taskId,
      ok: false,
      summary: "Runner interrompido por erro interno.",
      errorMessage: message,
    });
  }
}

export async function recoverTenantRuns(schemaName: string): Promise<{
  enqueued: number;
  staleFailed: number;
}> {
  const staleFailed = await runnerRepo.failStaleRunningRuns(schemaName, 10);
  const ids = await runnerRepo.listRunnableQueuedIds(schemaName, 20);
  for (const id of ids) {
    enqueueRunExecution(schemaName, id);
  }
  return { enqueued: ids.length, staleFailed };
}
