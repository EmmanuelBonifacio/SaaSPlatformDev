"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent, AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

/**
 * Chat surface: private tasks act as agent conversations until a dedicated
 * chat API exists (Paperclip /chats parity via V1 task threads).
 */
export function ChatsPanel() {
  const base = useAgentsBasePath();
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskRows, agentRows] = await Promise.all([
        agentsApiService.listTasks(),
        agentsApiService.listAgents(),
      ]);
      setTasks(taskRows.filter((t) => t.visibility === "private"));
      setAgents(agentRows);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function agentName(id: string | null): string {
    if (!id) return "Unassigned";
    return agents.find((a) => a.id === id)?.name ?? "Agent";
  }

  return (
    <div>
      <PageHeader
        title="Chat"
        description="Private task threads with agents. Open a conversation or start one from Dashboard."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={base}>Open dashboard thread</Link>
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

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No private conversations yet. Use Dashboard to start a thread with an
          agent.
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
              <p className="text-xs text-muted-foreground">
                {agentName(task.assigneeAgentId)}
              </p>
            </div>
            <StatusChip kind="task" status={task.status} />
          </Link>
        ))
      )}
    </div>
  );
}
