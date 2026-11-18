import { describe, expect, it } from "vitest";
import {
  evaluateBudgetAlerts,
  normalizeSpendInput,
  periodIntervalFragment,
} from "./agents.spend";

describe("agents.spend helpers", () => {
  it("normalizeSpendInput descarta zeros e limita tetos", () => {
    expect(
      normalizeSpendInput({
        runId: "r1",
        agentId: "a1",
        spendCents: 0,
        inputTokens: 0,
        outputTokens: 0,
      }),
    ).toBeNull();

    const row = normalizeSpendInput({
      runId: "r1",
      agentId: "a1",
      spendCents: 12.9,
      inputTokens: -5,
      outputTokens: 50.2,
      provider: "  anthropic  ",
      model: "claude-3-5-sonnet-20241022",
    });
    expect(row).toEqual({
      runId: "r1",
      agentId: "a1",
      taskId: null,
      spendCents: 12,
      inputTokens: 0,
      outputTokens: 50,
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });
  });

  it("normalizeSpendInput aceita só tokens sem cents", () => {
    const row = normalizeSpendInput({
      runId: "r2",
      agentId: "a2",
      spendCents: 0,
      inputTokens: 10,
      outputTokens: 0,
    });
    expect(row?.inputTokens).toBe(10);
    expect(row?.spendCents).toBe(0);
  });

  it("evaluateBudgetAlerts soft/hard", () => {
    expect(
      evaluateBudgetAlerts({
        spentCents: 80,
        softLimitCents: 100,
        hardLimitCents: 200,
        alertThresholdPct: 80,
      }),
    ).toEqual({ alert: true, overHard: false });

    expect(
      evaluateBudgetAlerts({
        spentCents: 200,
        softLimitCents: 100,
        hardLimitCents: 200,
        alertThresholdPct: 80,
      }),
    ).toEqual({ alert: true, overHard: true });

    expect(
      evaluateBudgetAlerts({
        spentCents: 10,
        softLimitCents: null,
        hardLimitCents: null,
        alertThresholdPct: 80,
      }),
    ).toEqual({ alert: false, overHard: false });
  });

  it("periodIntervalFragment cobre day/week/month", () => {
    expect(periodIntervalFragment("day").strings.join("")).toContain("1 day");
    expect(periodIntervalFragment("week").strings.join("")).toContain("7 days");
    expect(periodIntervalFragment("month").strings.join("")).toContain(
      "30 days",
    );
  });
});
