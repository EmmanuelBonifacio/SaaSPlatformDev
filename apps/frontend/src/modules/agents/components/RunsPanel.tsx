"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsRun } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { useAgentsLiveSocket } from "../hooks/useAgentsLiveSocket";
import { toAgentsOpError, type AgentsOpError } from "../lib/agents-ui";
import {
  AgentsEmptyState,
  AgentsErrorAlert,
  AgentsLoadingState,
} from "./board/AgentsFeedback";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function RunsPanel() {
  const base = useAgentsBasePath();
  const [runs, setRuns] = useState<AgentsRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AgentsOpError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRuns(await agentsApiService.listRuns({ limit: 50 }));
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  const { socketMode } = useAgentsLiveSocket({
    onRunEvent: () => {
      void refresh();
    },
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll only as fallback when socket is unavailable
  useEffect(() => {
    if (socketMode === "socket") return;
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [refresh, socketMode]);

  const liveCount = runs.filter(
    (r) => r.status === "running" || r.status === "queued",
  ).length;

  return (
    <div>
      <PageHeader
        title="Runs"
        description="Runner + heartbeats. Live updates via Socket.IO when connected."
        actions={
          <div className="flex items-center gap-2">
            {liveCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {liveCount} live
              </span>
            ) : null}
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {socketMode === "socket"
                ? "socket"
                : socketMode === "poll"
                  ? "poll"
                  : "…"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <AgentsErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}

      {loading ? (
        <AgentsLoadingState label="Loading runs…" />
      ) : runs.length === 0 ? (
        <AgentsEmptyState
          title="No runs yet"
          description="Dispatch a run from a task to see heartbeats and status here."
        />
      ) : (
        <ul className="space-y-2">
          {runs.map((run) => (
            <li key={run.id}>
              <Link href={`${base}/runs/${run.id}`} className="agents-row">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {run.id.slice(0, 8)} · {run.adapterType}
                  </p>
                  <p className="agents-mono">
                    {run.summary?.slice(0, 80) ||
                      run.errorMessage ||
                      run.status}
                  </p>
                </div>
                <StatusChip kind="generic" status={run.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
