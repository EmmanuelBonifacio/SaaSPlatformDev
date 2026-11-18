import { withTenantSchema } from "../../core/database/prisma";
import { buildWebhookUrl } from "./agents.adapters";
import {
  AGENT_COLS,
  mapAgent,
  writeActivity,
  type AgentRow,
  type Tx,
} from "./agents.repository.shared";
import { RUN_COLS, mapRun, type RunRow } from "./agents.repository.reads";
import {
  normalizeSpendInput,
  periodIntervalFragment,
  type SpendMeterInput,
} from "./agents.spend";
import type {
  AgentBudgetRecord,
  AgentRecord,
  LiveDashboard,
  RunRecord,
} from "./agents.types";
import type { AdapterSecretRef } from "./agents.adapters.shared";

export type RunnableRun = {
  run: RunRecord;
  agent: AgentRecord;
  taskTitle: string | null;
  taskDescription: string | null;
  secretRefs: AdapterSecretRef[];
  budget: AgentBudgetRecord | null;
  webhook: {
    url: string;
    host: string;
    secretEnv: string | null;
  } | null;
};

export async function claimQueuedRun(
  schemaName: string,
  runId: string,
): Promise<RunnableRun | null> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<RunRow[]>`
      UPDATE agent_runs SET
        status = 'running',
        started_at = COALESCE(started_at, NOW()),
        heartbeat_at = NOW(),
        updated_at = NOW()
      WHERE id = ${runId}::uuid AND status = 'queued'
      RETURNING ${RUN_COLS}
    `;
    if (!rows[0]) return null;
    return loadRunnable(tx, mapRun(rows[0]));
  });
}

export async function touchHeartbeat(
  schemaName: string,
  runId: string,
  agentId: string,
  phase: string,
): Promise<void> {
  await withTenantSchema(schemaName, async (tx) => {
    await tx.$executeRaw`
      UPDATE agent_runs
      SET heartbeat_at = NOW(), updated_at = NOW()
      WHERE id = ${runId}::uuid AND status = 'running'
    `;
    await tx.$executeRaw`
      UPDATE agents
      SET last_heartbeat_at = NOW(), status = 'active', updated_at = NOW()
      WHERE id = ${agentId}::uuid AND status <> 'paused'
    `;
    await writeActivity(tx, {
      actorType: "system",
      actorId: "runner",
      action: `run_heartbeat_${phase.slice(0, 40)}`,
      entityType: "run",
      entityId: runId,
      agentId,
      runId,
    });
  });
}

export async function finishRun(
  schemaName: string,
  input: {
    runId: string;
    agentId: string;
    taskId: string | null;
    ok: boolean;
    summary: string;
    errorMessage?: string | null;
    commentBody?: string;
  },
): Promise<RunRecord | null> {
  return withTenantSchema(schemaName, async (tx) => {
    const status = input.ok ? "succeeded" : "failed";
    const rows = await tx.$queryRaw<RunRow[]>`
      UPDATE agent_runs SET
        status = ${status},
        summary = ${input.summary.slice(0, 4000)},
        error_message = ${input.errorMessage?.slice(0, 500) ?? null},
        heartbeat_at = NOW(),
        finished_at = NOW(),
        updated_at = NOW()
      WHERE id = ${input.runId}::uuid AND status = 'running'
      RETURNING ${RUN_COLS}
    `;
    if (!rows[0]) return null;

    if (input.commentBody && input.taskId) {
      await tx.$executeRaw`
        INSERT INTO agent_task_comments (
          task_id, body, author_type, author_agent_id
        ) VALUES (
          ${input.taskId}::uuid,
          ${input.commentBody.slice(0, 4000)},
          'agent',
          ${input.agentId}::uuid
        )
      `;
    }

    const stillRunning = await tx.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c FROM agent_runs
      WHERE agent_id = ${input.agentId}::uuid AND status = 'running'
    `;
    if (Number(stillRunning[0]?.c ?? 0) === 0) {
      await tx.$executeRaw`
        UPDATE agents
        SET status = CASE WHEN status = 'paused' THEN status ELSE 'idle' END,
            last_heartbeat_at = NOW(),
            updated_at = NOW()
        WHERE id = ${input.agentId}::uuid
      `;
    }

    await writeActivity(tx, {
      actorType: "system",
      actorId: "runner",
      action: input.ok ? "run_succeeded" : "run_failed",
      entityType: "run",
      entityId: input.runId,
      agentId: input.agentId,
      runId: input.runId,
    });

    return mapRun(rows[0]);
  });
}

export async function failStaleRunningRuns(
  schemaName: string,
  olderThanMinutes: number,
): Promise<number> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE agent_runs SET
        status = 'failed',
        error_message = 'Run órfão: heartbeat expirado.',
        summary = COALESCE(summary, 'Recuperação: heartbeat expirado.'),
        finished_at = NOW(),
        updated_at = NOW()
      WHERE status = 'running'
        AND COALESCE(heartbeat_at, started_at, created_at)
          < NOW() - (${olderThanMinutes} || ' minutes')::interval
      RETURNING id
    `;
    return rows.length;
  });
}

export async function listRunnableQueuedIds(
  schemaName: string,
  limit: number,
): Promise<string[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<Array<{ id: string }>>`
      SELECT r.id
      FROM agent_runs r
      LEFT JOIN agent_approvals a
        ON a.related_run_id = r.id AND a.status = 'pending'
      WHERE r.status = 'queued' AND a.id IS NULL
      ORDER BY r.created_at ASC
      LIMIT ${limit}
    `,
  );
  return rows.map((r) => r.id);
}

export async function getLiveDashboard(
  schemaName: string,
): Promise<LiveDashboard> {
  return withTenantSchema(schemaName, async (tx) => {
    const runningRows = await tx.$queryRaw<RunRow[]>`
      SELECT ${RUN_COLS} FROM agent_runs
      WHERE status = 'running'
      ORDER BY heartbeat_at DESC NULLS LAST, created_at DESC
      LIMIT 25
    `;
    const queuedRows = await tx.$queryRaw<RunRow[]>`
      SELECT ${RUN_COLS} FROM agent_runs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 25
    `;
    const activeRows = await tx.$queryRaw<AgentRow[]>`
      SELECT ${AGENT_COLS} FROM agents
      WHERE status = 'active'
         OR last_heartbeat_at > NOW() - INTERVAL '2 minutes'
      ORDER BY last_heartbeat_at DESC NULLS LAST
      LIMIT 25
    `;
    const counts = await tx.$queryRaw<
      Array<{ running: bigint; queued: bigint; activeAgents: bigint }>
    >`
      SELECT
        (SELECT COUNT(*)::bigint FROM agent_runs WHERE status = 'running') AS running,
        (SELECT COUNT(*)::bigint FROM agent_runs WHERE status = 'queued') AS queued,
        (SELECT COUNT(*)::bigint FROM agents
          WHERE status = 'active'
             OR last_heartbeat_at > NOW() - INTERVAL '2 minutes') AS "activeAgents"
    `;
    return {
      counts: {
        running: Number(counts[0]?.running ?? 0),
        queued: Number(counts[0]?.queued ?? 0),
        activeAgents: Number(counts[0]?.activeAgents ?? 0),
      },
      runningRuns: runningRows.map(mapRun),
      queuedRuns: queuedRows.map(mapRun),
      activeAgents: activeRows.map(mapAgent),
    };
  });
}

export async function recordRunSpend(
  schemaName: string,
  input: SpendMeterInput,
): Promise<{ recorded: boolean }> {
  const normalized = normalizeSpendInput(input);
  if (!normalized) return { recorded: false };

  return withTenantSchema(schemaName, async (tx) => {
    const inserted = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO agent_spend_events (
        run_id, agent_id, task_id,
        input_tokens, output_tokens, spend_cents,
        provider, model
      ) VALUES (
        ${normalized.runId}::uuid,
        ${normalized.agentId}::uuid,
        ${normalized.taskId}::uuid,
        ${normalized.inputTokens},
        ${normalized.outputTokens},
        ${normalized.spendCents},
        ${normalized.provider},
        ${normalized.model}
      )
      ON CONFLICT (run_id) DO NOTHING
      RETURNING id
    `;
    if (!inserted[0]) return { recorded: false };

    await tx.$executeRaw`
      UPDATE agent_runs SET
        spend_cents = ${normalized.spendCents},
        input_tokens = ${normalized.inputTokens},
        output_tokens = ${normalized.outputTokens},
        updated_at = NOW()
      WHERE id = ${normalized.runId}::uuid
    `;

    if (normalized.spendCents > 0) {
      await tx.$executeRaw`
        INSERT INTO agent_budgets (agent_id, spent_cents)
        VALUES (${normalized.agentId}::uuid, ${normalized.spendCents})
        ON CONFLICT (agent_id) DO UPDATE SET
          spent_cents = agent_budgets.spent_cents + EXCLUDED.spent_cents,
          updated_at = NOW()
      `;
    }
    return { recorded: true };
  });
}

export function isHardBudgetExceeded(budget: AgentBudgetRecord | null): boolean {
  if (!budget || budget.hardLimitCents === null) return false;
  return budget.spentCents >= budget.hardLimitCents;
}

async function sumPeriodSpendCents(
  tx: Tx,
  agentId: string,
  period: AgentBudgetRecord["period"],
): Promise<number> {
  const interval = periodIntervalFragment(period);
  const rows = await tx.$queryRaw<Array<{ spentCents: number }>>`
    SELECT COALESCE(SUM(spend_cents), 0)::int AS "spentCents"
    FROM agent_spend_events
    WHERE agent_id = ${agentId}::uuid
      AND created_at >= NOW() - ${interval}
  `;
  return rows[0]?.spentCents ?? 0;
}

async function loadRunnable(tx: Tx, run: RunRecord): Promise<RunnableRun> {
  const agents = await tx.$queryRaw<AgentRow[]>`
    SELECT ${AGENT_COLS} FROM agents WHERE id = ${run.agentId}::uuid LIMIT 1
  `;
  const agent = mapAgent(agents[0]);
  let taskTitle: string | null = null;
  let taskDescription: string | null = null;
  if (run.taskId) {
    const tasks = await tx.$queryRaw<
      Array<{ title: string; description: string | null }>
    >`
      SELECT title, description FROM agent_tasks
      WHERE id = ${run.taskId}::uuid LIMIT 1
    `;
    taskTitle = tasks[0]?.title ?? null;
    taskDescription = tasks[0]?.description ?? null;
  }

  const secretRows = await tx.$queryRaw<AdapterSecretRef[]>`
    SELECT name, env_ref AS "envRef"
    FROM agent_secret_refs
    WHERE agent_id = ${run.agentId}::uuid
    ORDER BY created_at ASC
    LIMIT 50
  `;

  const budgetRows = await tx.$queryRaw<
    Array<{
      agentId: string;
      period: AgentBudgetRecord["period"];
      softLimitCents: number | null;
      hardLimitCents: number | null;
      spentCents: number;
      alertThresholdPct: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT agent_id AS "agentId", period,
      soft_limit_cents AS "softLimitCents",
      hard_limit_cents AS "hardLimitCents",
      spent_cents AS "spentCents",
      alert_threshold_pct AS "alertThresholdPct",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM agent_budgets
    WHERE agent_id = ${run.agentId}::uuid
    LIMIT 1
  `;
  const budgetRow = budgetRows[0];
  let budget: AgentBudgetRecord | null = null;
  if (budgetRow) {
    const periodSpent = await sumPeriodSpendCents(
      tx,
      run.agentId,
      budgetRow.period,
    );
    budget = {
      ...budgetRow,
      // Hard stop usa spend real do período (ledger), não só o contador legado.
      spentCents: periodSpent,
      createdAt: budgetRow.createdAt.toISOString(),
      updatedAt: budgetRow.updatedAt.toISOString(),
    };
  }

  const connectors = await tx.$queryRaw<
    Array<{
      config: { host?: string; path?: string };
      secretRef: string | null;
    }>
  >`
    SELECT config, secret_ref AS "secretRef"
    FROM agent_connectors
    WHERE status = 'enabled' AND kind = 'webhook'
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const connector = connectors[0];
  let webhook: RunnableRun["webhook"] = null;
  if (connector?.config?.host) {
    const url = buildWebhookUrl(
      connector.config.host,
      connector.config.path || "/hooks/agents/run",
    );
    if (url) {
      webhook = {
        url,
        host: connector.config.host,
        secretEnv: connector.secretRef,
      };
    }
  }

  return {
    run,
    agent,
    taskTitle,
    taskDescription,
    secretRefs: secretRows,
    budget,
    webhook,
  };
}
