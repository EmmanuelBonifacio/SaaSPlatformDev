import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import {
  AGENT_COLS,
  mapAgent,
  type AgentRow,
} from "./agents.repository.shared";
import {
  evaluateBudgetAlerts,
  type BudgetPeriod,
} from "./agents.spend";
import type { AgentRecord } from "./agents.types";

export type OrgNode = AgentRecord & { children: OrgNode[] };

export type CostSpendEvent = {
  id: string;
  runId: string;
  agentId: string;
  agentName: string;
  taskId: string | null;
  inputTokens: number;
  outputTokens: number;
  spendCents: number;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

export type CostAgentRow = {
  agentId: string;
  agentName: string;
  agentStatus: string;
  period: BudgetPeriod;
  softLimitCents: number | null;
  hardLimitCents: number | null;
  /** Spend do período a partir do ledger `agent_spend_events`. */
  spentCents: number;
  inputTokens: number;
  outputTokens: number;
  eventCount: number;
  alertThresholdPct: number;
  alert: boolean;
  overHard: boolean;
};

export type CostsSummary = {
  agentCount: number;
  totalSpentCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalSoftLimitCents: number | null;
  totalHardLimitCents: number | null;
  alertCount: number;
  overHardCount: number;
  /** Sempre ledger real; sem billing Paperclip externo. */
  source: "spend_events";
  agents: CostAgentRow[];
  recentEvents: CostSpendEvent[];
};

type CostJoinRow = {
  agentId: string;
  agentName: string;
  agentStatus: string;
  period: BudgetPeriod;
  softLimitCents: number | null;
  hardLimitCents: number | null;
  alertThresholdPct: number;
  spentCents: number;
  inputTokens: number;
  outputTokens: number;
  eventCount: number;
};

type EventRow = {
  id: string;
  runId: string;
  agentId: string;
  agentName: string;
  taskId: string | null;
  inputTokens: number;
  outputTokens: number;
  spendCents: number;
  provider: string | null;
  model: string | null;
  createdAt: Date;
};

export async function listOrgAgents(
  schemaName: string,
): Promise<AgentRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AgentRow[]>`
      SELECT ${AGENT_COLS} FROM agents
      ORDER BY name ASC
      LIMIT 500
    `,
  );
  return rows.map(mapAgent);
}

export function buildOrgTree(agents: AgentRecord[]): OrgNode[] {
  const byId = new Map<string, OrgNode>();
  for (const agent of agents) {
    byId.set(agent.id, { ...agent, children: [] });
  }
  const roots: OrgNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.reportsToAgentId;
    if (parentId && byId.has(parentId) && parentId !== node.id) {
      byId.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: OrgNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export async function assertValidReportsTo(
  schemaName: string,
  agentId: string,
  reportsToAgentId: string | null,
): Promise<void> {
  if (reportsToAgentId == null) return;
  if (reportsToAgentId === agentId) {
    throw new AgentsModuleError(400, "Agente não pode reportar a si mesmo.");
  }
  const agents = await listOrgAgents(schemaName);
  const byId = new Map(agents.map((a) => [a.id, a]));
  if (!byId.has(reportsToAgentId)) {
    throw new AgentsModuleError(400, "Superior hierárquico não encontrado.");
  }
  let cursor: string | null = reportsToAgentId;
  const seen = new Set<string>([agentId]);
  while (cursor) {
    if (seen.has(cursor)) {
      throw new AgentsModuleError(400, "Hierarquia cíclica não permitida.");
    }
    seen.add(cursor);
    cursor = byId.get(cursor)?.reportsToAgentId ?? null;
  }
}

export async function getCostsSummary(
  schemaName: string,
): Promise<CostsSummary> {
  return withTenantSchema(schemaName, async (tx) => {
    const rows = await tx.$queryRaw<CostJoinRow[]>`
      SELECT a.id AS "agentId", a.name AS "agentName", a.status AS "agentStatus",
        COALESCE(b.period, 'month') AS period,
        b.soft_limit_cents AS "softLimitCents",
        b.hard_limit_cents AS "hardLimitCents",
        COALESCE(b.alert_threshold_pct, 80) AS "alertThresholdPct",
        COALESCE(m.spent_cents, 0)::int AS "spentCents",
        COALESCE(m.input_tokens, 0)::int AS "inputTokens",
        COALESCE(m.output_tokens, 0)::int AS "outputTokens",
        COALESCE(m.event_count, 0)::int AS "eventCount"
      FROM agents a
      LEFT JOIN agent_budgets b ON b.agent_id = a.id
      LEFT JOIN LATERAL (
        SELECT
          SUM(e.spend_cents) AS spent_cents,
          SUM(e.input_tokens) AS input_tokens,
          SUM(e.output_tokens) AS output_tokens,
          COUNT(*)::int AS event_count
        FROM agent_spend_events e
        WHERE e.agent_id = a.id
          AND e.created_at >= NOW() - CASE COALESCE(b.period, 'month')
            WHEN 'day' THEN INTERVAL '1 day'
            WHEN 'week' THEN INTERVAL '7 days'
            ELSE INTERVAL '30 days'
          END
      ) m ON true
      ORDER BY COALESCE(m.spent_cents, 0) DESC, a.name ASC
      LIMIT 500
    `;

    const agents: CostAgentRow[] = rows.map((r) => ({
      ...r,
      ...evaluateBudgetAlerts({
        spentCents: r.spentCents,
        softLimitCents: r.softLimitCents,
        hardLimitCents: r.hardLimitCents,
        alertThresholdPct: r.alertThresholdPct,
      }),
    }));

    const softs = agents
      .map((a) => a.softLimitCents)
      .filter((v): v is number => v != null);
    const hards = agents
      .map((a) => a.hardLimitCents)
      .filter((v): v is number => v != null);

    const recentRows = await tx.$queryRaw<EventRow[]>`
      SELECT e.id, e.run_id AS "runId", e.agent_id AS "agentId",
        a.name AS "agentName", e.task_id AS "taskId",
        e.input_tokens AS "inputTokens",
        e.output_tokens AS "outputTokens",
        e.spend_cents AS "spendCents",
        e.provider, e.model, e.created_at AS "createdAt"
      FROM agent_spend_events e
      JOIN agents a ON a.id = e.agent_id
      ORDER BY e.created_at DESC
      LIMIT 50
    `;

    return {
      agentCount: agents.length,
      totalSpentCents: agents.reduce((sum, a) => sum + a.spentCents, 0),
      totalInputTokens: agents.reduce((sum, a) => sum + a.inputTokens, 0),
      totalOutputTokens: agents.reduce((sum, a) => sum + a.outputTokens, 0),
      totalSoftLimitCents: softs.length
        ? softs.reduce((a, b) => a + b, 0)
        : null,
      totalHardLimitCents: hards.length
        ? hards.reduce((a, b) => a + b, 0)
        : null,
      alertCount: agents.filter((a) => a.alert).length,
      overHardCount: agents.filter((a) => a.overHard).length,
      source: "spend_events",
      agents,
      recentEvents: recentRows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}
