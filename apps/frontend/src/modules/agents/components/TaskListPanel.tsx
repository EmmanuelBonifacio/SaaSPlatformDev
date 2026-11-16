"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage, statusLabel } from "../lib/agents-ui";

export function TaskListPanel() {
  const base = useAgentsBasePath();
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTasks(await agentsApiService.listTasks());
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
        <h2 className="text-lg font-semibold">Tarefas</h2>
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
            <CardTitle>Lista ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`${base}/tasks/${task.id}`}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 hover:border-primary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel(task.status)}
                    {task.visibility === "private" ? " · privada" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {task.priority}
                </span>
              </Link>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa. Crie uma pelo Dashboard.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
