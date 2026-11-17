import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import {
  AGENT_COLS,
  mapAgent,
  type AgentRow,
} from "./agents.repository.shared";
import type { AgentRecord } from "./agents.types";

export type OrgNode = AgentRecord & { children: OrgNode[] };

export type CostAgentRow = {
  agentId: string;
  agentName: string;
  agentStatus: string;
  period: "day" | "week" | "month";
  softLimitCents: number | null;
  hardLimitCents: number | null;
  spentCents: number;
  alertThresholdPct: number;
  alert: boolean;
  overHard: boolean;
};

export type CostsSummary = {
  agentCount: number;
  totalSpentCents: number;
  totalSoftLimitCents: number | null;
  totalHardLimitCents: number | null;
  alertCount: number;
  overHardCount: number;
  agents: CostAgentRow[];
};

type BudgetJoinRow = {
  agentId: string;
  agentName: string;
  agentStatus: string;
  period: "day" | "week" | "month";
  softLimitCents: number | null;
  hardLimitCents: number | null;
  spentCents: number;
  alertThresholdPct: number;
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
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<BudgetJoinRow[]>`
      SELECT a.id AS "agentId", a.name AS "agentName", a.status AS "agentStatus",
        COALESCE(b.period, 'month') AS period,
        b.soft_limit_cents AS "softLimitCents",
        b.hard_limit_cents AS "hardLimitCents",
        COALESCE(b.spent_cents, 0) AS "spentCents",
        COALESCE(b.alert_threshold_pct, 80) AS "alertThresholdPct"
      FROM agents a
      LEFT JOIN agent_budgets b ON b.agent_id = a.id
      ORDER BY COALESCE(b.spent_cents, 0) DESC, a.name ASC
      LIMIT 500
    `,
  );

  const agents: CostAgentRow[] = rows.map((r) => {
    const soft = r.softLimitCents;
    const hard = r.hardLimitCents;
    const spent = r.spentCents;
    const alert =
      soft != null && soft > 0
        ? spent >= Math.floor((soft * r.alertThresholdPct) / 100)
        : hard != null && hard > 0
          ? spent >= Math.floor((hard * r.alertThresholdPct) / 100)
          : false;
    const overHard = hard != null && hard > 0 && spent >= hard;
    return { ...r, alert, overHard };
  });

  const softs = agents
    .map((a) => a.softLimitCents)
    .filter((v): v is number => v != null);
  const hards = agents
    .map((a) => a.hardLimitCents)
    .filter((v): v is number => v != null);

  return {
    agentCount: agents.length,
    totalSpentCents: agents.reduce((sum, a) => sum + a.spentCents, 0),
    totalSoftLimitCents: softs.length ? softs.reduce((a, b) => a + b, 0) : null,
    totalHardLimitCents: hards.length ? hards.reduce((a, b) => a + b, 0) : null,
    alertCount: agents.filter((a) => a.alert).length,
    overHardCount: agents.filter((a) => a.overHard).length,
    agents,
  };
}
