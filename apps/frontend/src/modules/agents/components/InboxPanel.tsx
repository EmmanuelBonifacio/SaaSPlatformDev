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

export function InboxPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [approvals, setApprovals] = useState<AgentsApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const taskRows = await agentsApiService.listTasks();
      setTasks(
        taskRows.filter(
          (t) => t.status === "blocked" || t.status === "in_progress",
        ),
      );
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

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="What needs attention — pending approvals and active/blocked tasks."
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
            <h2 className="agents-section-label mb-2">Approvals</h2>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                Approvals require admin. Tasks below still show.
              </p>
            ) : approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending approvals.</p>
            ) : (
              approvals.map((row) => (
                <Link
                  key={row.id}
                  href={`${base}/approvals`}
                  className="agents-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.type}</p>
                    <p className="agents-mono">{row.id.slice(0, 8)}</p>
                  </div>
                  <StatusChip kind="generic" status={row.status} />
                </Link>
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">Active tasks</h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing in progress or blocked.
              </p>
            ) : (
              tasks.map((task) => (
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
