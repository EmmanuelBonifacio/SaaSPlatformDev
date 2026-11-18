/**
 * Helpers puros de metering de spend (SP-39).
 * Sem I/O — usados pelo runner, costs e testes.
 */

import { Prisma } from "@prisma/client";

export type BudgetPeriod = "day" | "week" | "month";

export type SpendMeterInput = {
  runId: string;
  agentId: string;
  taskId?: string | null;
  spendCents: number;
  inputTokens?: number;
  outputTokens?: number;
  provider?: string | null;
  model?: string | null;
};

export type NormalizedSpend = {
  runId: string;
  agentId: string;
  taskId: string | null;
  spendCents: number;
  inputTokens: number;
  outputTokens: number;
  provider: string | null;
  model: string | null;
};

const MAX_SPEND_CENTS = 1_000_000;
const MAX_TOKENS = 100_000_000;

function nonNegInt(value: number | undefined, max: number): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

export function normalizeSpendInput(input: SpendMeterInput): NormalizedSpend | null {
  const spendCents = nonNegInt(input.spendCents, MAX_SPEND_CENTS);
  const inputTokens = nonNegInt(input.inputTokens, MAX_TOKENS);
  const outputTokens = nonNegInt(input.outputTokens, MAX_TOKENS);
  if (spendCents <= 0 && inputTokens <= 0 && outputTokens <= 0) {
    return null;
  }
  return {
    runId: input.runId,
    agentId: input.agentId,
    taskId: input.taskId ?? null,
    spendCents,
    inputTokens,
    outputTokens,
    provider: input.provider?.trim().slice(0, 64) || null,
    model: input.model?.trim().slice(0, 120) || null,
  };
}

/** Fragmento SQL seguro (literal) para janela rolling do período. */
export function periodIntervalFragment(period: BudgetPeriod): Prisma.Sql {
  if (period === "day") return Prisma.sql`INTERVAL '1 day'`;
  if (period === "week") return Prisma.sql`INTERVAL '7 days'`;
  return Prisma.sql`INTERVAL '30 days'`;
}

export function evaluateBudgetAlerts(input: {
  spentCents: number;
  softLimitCents: number | null;
  hardLimitCents: number | null;
  alertThresholdPct: number;
}): { alert: boolean; overHard: boolean } {
  const { spentCents, softLimitCents, hardLimitCents, alertThresholdPct } =
    input;
  const soft = softLimitCents;
  const hard = hardLimitCents;
  const alert =
    soft != null && soft > 0
      ? spentCents >= Math.floor((soft * alertThresholdPct) / 100)
      : hard != null && hard > 0
        ? spentCents >= Math.floor((hard * alertThresholdPct) / 100)
        : false;
  const overHard = hard != null && hard > 0 && spentCents >= hard;
  return { alert, overHard };
}
