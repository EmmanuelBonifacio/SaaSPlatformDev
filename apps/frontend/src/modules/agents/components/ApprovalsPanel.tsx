"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsApproval } from "@/types/agents.types";
import { toAgentsOpError, type AgentsOpError } from "../lib/agents-ui";
import {
  AgentsEmptyState,
  AgentsErrorAlert,
  AgentsLoadingState,
  AgentsSuccessAlert,
} from "./board/AgentsFeedback";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function ApprovalsPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [rows, setRows] = useState<AgentsApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<AgentsOpError | null>(null);
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await agentsApiService.listApprovals({ limit: 50 }));
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setActing(id);
    setError(null);
    setSuccess("");
    try {
      await agentsApiService.decideApproval(id, { decision });
      setSuccess(
        decision === "approved"
          ? "Approval granted — run can proceed."
          : "Approval rejected.",
      );
      await refresh();
    } catch (reason) {
      setError(toAgentsOpError(reason));
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
        <AgentsEmptyState
          title="Admin role required"
          description="Approvals require admin. The nav stays visible; the API returns 403 otherwise."
        />
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
        <AgentsErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}
      {success ? (
        <AgentsSuccessAlert
          message={success}
          onDismiss={() => setSuccess("")}
        />
      ) : null}

      {loading ? (
        <AgentsLoadingState label="Loading approvals…" />
      ) : rows.length === 0 ? (
        <AgentsEmptyState
          title="Queue clear"
          description="No approvals waiting. New run gates will show up here."
          action={{ label: "Refresh", onClick: () => void refresh() }}
        />
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
                  {acting === row.id ? "Working…" : "Approve"}
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
