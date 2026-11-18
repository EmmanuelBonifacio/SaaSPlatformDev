"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

type CostAgent = {
  agentId: string;
  agentName: string;
  agentStatus: string;
  period: string;
  softLimitCents: number | null;
  hardLimitCents: number | null;
  spentCents: number;
  inputTokens: number;
  outputTokens: number;
  eventCount: number;
  alertThresholdPct: number;
  alert: boolean;
  overHard: boolean;
};

type CostSpendEvent = {
  id: string;
  runId: string;
  agentId: string;
  agentName: string;
  spendCents: number;
  inputTokens: number;
  outputTokens: number;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

type CostsSummary = {
  agentCount: number;
  totalSpentCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalSoftLimitCents: number | null;
  totalHardLimitCents: number | null;
  alertCount: number;
  overHardCount: number;
  source: "spend_events";
  agents: CostAgent[];
  recentEvents: CostSpendEvent[];
};

function cents(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n / 100).toFixed(2)}`;
}

function tokens(n: number): string {
  return n.toLocaleString();
}

export function CostsPanel() {
  const base = useAgentsBasePath();
  const [data, setData] = useState<CostsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<CostsSummary>("/agents/costs");
      setData(response.data);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div>
      <PageHeader
        title="Costs"
        description="Metered spend from agent runs (tokens + cents). No external Paperclip billing."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading || !data ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Agents" value={String(data.agentCount)} />
            <SummaryStat
              label="Period spent"
              value={cents(data.totalSpentCents)}
            />
            <SummaryStat
              label="Tokens in/out"
              value={`${tokens(data.totalInputTokens)} / ${tokens(data.totalOutputTokens)}`}
            />
            <SummaryStat
              label="Alerts / hard"
              value={`${data.alertCount} / ${data.overHardCount}`}
            />
          </div>
          {data.agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents yet.</p>
          ) : (
            data.agents.map((row) => (
              <div key={row.agentId} className="agents-row">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${base}/${row.agentId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {row.agentName}
                  </Link>
                  <p className="agents-mono">
                    spent {cents(row.spentCents)} / soft{" "}
                    {cents(row.softLimitCents)} / hard{" "}
                    {cents(row.hardLimitCents)} · {row.period}
                    {" · "}
                    {tokens(row.inputTokens)}↑ {tokens(row.outputTokens)}↓
                    {" · "}
                    {row.eventCount} runs
                    {row.alert ? " · alert" : ""}
                    {row.overHard ? " · HARD" : ""}
                  </p>
                </div>
                <StatusChip kind="agent" status={row.agentStatus} />
              </div>
            ))
          )}
          {data.recentEvents.length > 0 ? (
            <div className="mt-6">
              <h2 className="agents-section-label mb-2">Recent metered runs</h2>
              {data.recentEvents.map((ev) => (
                <div key={ev.id} className="agents-row">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {ev.agentName}
                      <span className="ml-2 agents-mono text-muted-foreground">
                        {ev.runId.slice(0, 8)}
                      </span>
                    </p>
                    <p className="agents-mono">
                      {cents(ev.spendCents)} · {tokens(ev.inputTokens)}↑{" "}
                      {tokens(ev.outputTokens)}↓
                      {ev.provider ? ` · ${ev.provider}` : ""}
                      {ev.model ? ` / ${ev.model}` : ""}
                      {" · "}
                      {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="agents-section-label">{label}</p>
      <p className="text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}
