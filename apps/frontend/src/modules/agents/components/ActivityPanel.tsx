"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsActivity } from "@/types/agents.types";
import { errorMessage, statusLabel } from "../lib/agents-ui";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Activity</h2>
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
            <CardTitle>Feed ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {statusLabel(row.action)} · {row.entityType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.actorType}:{row.actorId.slice(0, 8)} ·{" "}
                  {new Date(row.createdAt).toLocaleString()}
                  {row.runId ? ` · run ${row.runId.slice(0, 8)}` : ""}
                </p>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade registrada.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
