"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsActivity } from "@/types/agents.types";
import { errorMessage, statusLabel } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";

export function ActivityPanel() {
  const [rows, setRows] = useState<AgentsActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await agentsApiService.listActivity({ limit: 50 }));
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
        title="Activity"
        description="Audit feed for agent and task mutations in this tenant."
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
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {statusLabel(row.action)} · {row.entityType}
              </p>
              <p className="agents-mono">
                {row.actorType}:{row.actorId.slice(0, 8)} ·{" "}
                {new Date(row.createdAt).toLocaleString()}
                {row.runId ? ` · run ${row.runId.slice(0, 8)}` : ""}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
