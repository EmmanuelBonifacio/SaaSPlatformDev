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
  alertThresholdPct: number;
  alert: boolean;
  overHard: boolean;
};

type CostsSummary = {
  agentCount: number;
  totalSpentCents: number;
  totalSoftLimitCents: number | null;
  totalHardLimitCents: number | null;
  alertCount: number;
  overHardCount: number;
  agents: CostAgent[];
};

function cents(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n / 100).toFixed(2)}`;
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
        description="Tenant rollup of agent budgets and spend (cents → currency display). External harness billing excluded."
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
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <SummaryStat label="Agents" value={String(data.agentCount)} />
            <SummaryStat
              label="Total spent"
              value={cents(data.totalSpentCents)}
            />
            <SummaryStat
              label="Alerts"
              value={String(data.alertCount)}
            />
            <SummaryStat
              label="Over hard"
              value={String(data.overHardCount)}
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
                    {row.alert ? " · alert" : ""}
                    {row.overHard ? " · HARD" : ""}
                  </p>
                </div>
                <StatusChip kind="agent" status={row.agentStatus} />
              </div>
            ))
          )}
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
