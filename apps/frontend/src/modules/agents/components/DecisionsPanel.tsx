"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsApproval, AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { toAgentsOpError, type AgentsOpError } from "../lib/agents-ui";
import {
  AgentsEmptyState,
  AgentsErrorAlert,
  AgentsLoadingState,
  AgentsSuccessAlert,
} from "./board/AgentsFeedback";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

/**
 * Decisions = what needs an operator call: pending approvals + blocked tasks.
 * Join-request / hire queues stay out of scope (no Paperclip auth).
 */
export function DecisionsPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [approvals, setApprovals] = useState<AgentsApproval[]>([]);
  const [blocked, setBlocked] = useState<AgentsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<AgentsOpError | null>(null);
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tasks = await agentsApiService.listTasks();
      setBlocked(tasks.filter((t) => t.status === "blocked"));
      if (isAdmin) {
        setApprovals(
          await agentsApiService.listApprovals({
            status: "pending",
            limit: 50,
          }),
        );
      } else {
        setApprovals([]);
      }
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(
    approvalId: string,
    decision: "approved" | "rejected",
  ) {
    setActing(approvalId);
    setError(null);
    setSuccess("");
    try {
      await agentsApiService.decideApproval(approvalId, { decision });
      setSuccess(
        decision === "approved"
          ? "Approved — gated run can dispatch."
          : "Rejected — run stays blocked.",
      );
      await refresh();
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Decisions"
        description="Pending approvals and blocked tasks that need an operator call."
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
        <AgentsLoadingState label="Loading decisions…" />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="agents-section-label mb-2">
              Approvals ({approvals.length})
            </h2>
            {!isAdmin ? (
              <AgentsEmptyState
                title="Admin-only approvals"
                description="Only admins can decide run approvals."
              />
            ) : approvals.length === 0 ? (
              <AgentsEmptyState
                title="Queue clear"
                description="No pending approvals right now."
              />
            ) : (
              approvals.map((row) => (
                <div key={row.id} className="agents-row">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.type}</p>
                    <p className="agents-mono">
                      {(row.relatedRunId ?? row.relatedTaskId ?? row.id).slice(
                        0,
                        8,
                      )}
                    </p>
                  </div>
                  <StatusChip kind="generic" status={row.status} />
                  <div className="flex gap-1">
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
                </div>
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">
              Blocked tasks ({blocked.length})
            </h2>
            {blocked.length === 0 ? (
              <AgentsEmptyState
                title="No blocked tasks"
                description="Blocked issues that need an operator call will list here."
              />
            ) : (
              blocked.map((task) => (
                <Link
                  key={task.id}
                  href={`${base}/tasks/${task.id}`}
                  className="agents-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="agents-mono">{task.priority}</p>
                  </div>
                  <StatusChip kind="task" status={task.status} />
                </Link>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
