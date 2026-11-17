"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsRun } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function RunsPanel() {
  const base = useAgentsBasePath();
  const [runs, setRuns] = useState<AgentsRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRuns(await agentsApiService.listRuns({ limit: 50 }));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const liveCount = runs.filter(
    (r) => r.status === "running" || r.status === "queued",
  ).length;

  return (
    <div>
      <PageHeader
        title="Runs"
        description="Runner + heartbeats. Stub/webhook adapters advance status; Claude/Codex harnesses ainda externos."
        actions={
          <div className="flex items-center gap-2">
            {liveCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {liveCount} live
              </span>
            ) : null}
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
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs yet.</p>
      ) : (
        runs.map((run) => (
          <Link
            key={run.id}
            href={`${base}/runs/${run.id}`}
            className="agents-row"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                agent {run.agentId.slice(0, 8)}
                {run.taskId ? ` · task ${run.taskId.slice(0, 8)}` : ""}
              </p>
              <p className="agents-mono">
                {new Date(run.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusChip kind="generic" status={run.status} />
          </Link>
        ))
      )}
    </div>
  );
}
