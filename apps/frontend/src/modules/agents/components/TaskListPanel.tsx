"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { toAgentsOpError, type AgentsOpError } from "../lib/agents-ui";
import {
  AgentsEmptyState,
  AgentsErrorAlert,
  AgentsLoadingState,
} from "./board/AgentsFeedback";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function TaskListPanel() {
  const base = useAgentsBasePath();
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AgentsOpError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await agentsApiService.listTasks());
    } catch (reason) {
      setError(toAgentsOpError(reason));
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
        title="Tarefas"
        description="Fila de trabalho deste tenant. Use Nova tarefa na barra lateral para criar."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {error ? (
        <AgentsErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}

      {loading ? (
        <AgentsLoadingState label="Carregando tarefas…" />
      ) : tasks.length === 0 ? (
        <AgentsEmptyState
          title="Nenhuma tarefa ainda"
          description="Use Nova tarefa na barra lateral para criar a primeira issue."
        />
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
                {task.priority}
                {task.visibility === "private" ? " · private" : ""}
              </p>
            </div>
            <StatusChip kind="task" status={task.status} />
          </Link>
        ))
      )}
    </div>
  );
}
