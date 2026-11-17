"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsApproval, AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
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
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
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
      setError(errorMessage(reason));
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
    setError("");
    try {
      await agentsApiService.decideApproval(approvalId, { decision });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
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
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="agents-section-label mb-2">
              Approvals ({approvals.length})
            </h2>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                Only admins can decide run approvals.
              </p>
            ) : approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Queue clear.</p>
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
                </div>
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">
              Blocked tasks ({blocked.length})
            </h2>
            {blocked.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocked tasks.</p>
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
