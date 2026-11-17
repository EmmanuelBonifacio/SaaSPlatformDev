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

  return (
    <div>
      <PageHeader
        title="Runs"
        description="Heartbeat / run history. Execution remains stub until adapters ship."
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
