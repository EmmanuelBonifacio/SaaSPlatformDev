"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsRun } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage, statusLabel } from "../lib/agents-ui";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Runs</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Histórico ({runs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`${base}/runs/${run.id}`}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 hover:border-primary"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{statusLabel(run.status)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    agent {run.agentId.slice(0, 8)}
                    {run.taskId ? ` · task ${run.taskId.slice(0, 8)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
            {runs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum run ainda.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
