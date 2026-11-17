"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type View = "attention" | "mine" | "blocked" | "recent" | "all";

const VIEWS: { id: View; label: string }[] = [
  { id: "attention", label: "Attention" },
  { id: "mine", label: "Mine" },
  { id: "blocked", label: "Blocked" },
  { id: "recent", label: "Recent" },
  { id: "all", label: "All" },
];

export function InboxPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const userId = user?.sub ?? "";
  const [view, setView] = useState<View>("attention");
  const [allTasks, setAllTasks] = useState<AgentsTask[]>([]);
  const [approvals, setApprovals] = useState<AgentsApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const taskRows = await agentsApiService.listTasks();
      setAllTasks(taskRows);
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

  const tasks = useMemo(() => {
    const sorted = [...allTasks].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    switch (view) {
      case "attention":
        return sorted.filter(
          (t) => t.status === "blocked" || t.status === "in_progress",
        );
      case "mine":
        return sorted.filter((t) => t.createdByUserId === userId);
      case "blocked":
        return sorted.filter((t) => t.status === "blocked");
      case "recent":
        return sorted.slice(0, 25);
      case "all":
        return sorted;
      default:
        return sorted;
    }
  }, [allTasks, view, userId]);

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Attention queue with mine / blocked / recent views. Decisions live under Decisions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/decisions`}>Decisions</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {VIEWS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={view === item.id ? "default" : "outline"}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

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
          {view === "attention" ? (
            <section>
              <h2 className="agents-section-label mb-2">
                Pending decisions ({approvals.length})
              </h2>
              {!isAdmin ? (
                <p className="text-sm text-muted-foreground">
                  Approvals require admin.{" "}
                  <Link href={`${base}/decisions`} className="underline">
                    Open Decisions
                  </Link>
                </p>
              ) : approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending approvals.
                </p>
              ) : (
                approvals.map((row) => (
                  <Link
                    key={row.id}
                    href={`${base}/decisions`}
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
          ) : null}

          <section>
            <h2 className="agents-section-label mb-2">
              Tasks ({tasks.length})
            </h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in this view.</p>
            ) : (
              tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`${base}/tasks/${task.id}`}
                  className="agents-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="agents-mono">
                      {task.priority} · {task.visibility}
                    </p>
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
