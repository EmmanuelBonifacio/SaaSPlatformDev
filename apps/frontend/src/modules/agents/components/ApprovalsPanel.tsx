"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsApproval } from "@/types/agents.types";
import { errorMessage, statusLabel } from "../lib/agents-ui";

export function ApprovalsPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [rows, setRows] = useState<AgentsApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setRows(await agentsApiService.listApprovals({ limit: 50 }));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(
    id: string,
    decision: "approved" | "rejected",
  ) {
    setActing(id);
    setError("");
    try {
      await agentsApiService.decideApproval(id, { decision });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setActing(null);
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Aprovações exigem papel admin. O link fica disponível; a API bloqueia
        usuários sem permissão.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Approvals</h2>
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
            <CardTitle>Fila ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {row.type} · {statusLabel(row.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                    {row.relatedTaskId ? ` · task ${row.relatedTaskId.slice(0, 8)}` : ""}
                  </p>
                </div>
                {row.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={acting === row.id}
                      onClick={() => void decide(row.id, "approved")}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acting === row.id}
                      onClick={() => void decide(row.id, "rejected")}
                    >
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma aprovação na fila.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
