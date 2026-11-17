"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsApproval } from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

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

  async function decide(id: string, decision: "approved" | "rejected") {
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
      <div>
        <PageHeader
          title="Approvals"
          description="Admin-only queue. Your role cannot decide gates."
        />
        <p className="text-sm text-muted-foreground">
          Approvals require admin. The nav stays; the API returns 403 otherwise.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Decide pending gates for runs and agent actions."
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
        <p className="text-sm text-muted-foreground">No approvals in the queue.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.type}</p>
              <p className="agents-mono">
                {new Date(row.createdAt).toLocaleString()}
                {row.relatedTaskId
                  ? ` · task ${row.relatedTaskId.slice(0, 8)}`
                  : ""}
              </p>
            </div>
            <StatusChip kind="generic" status={row.status} />
            {row.status === "pending" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={acting === row.id}
                  onClick={() => void decide(row.id, "approved")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting === row.id}
                  onClick={() => void decide(row.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
