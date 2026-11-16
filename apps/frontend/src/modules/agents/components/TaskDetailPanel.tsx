"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { agentsApiService } from "@/services/agents.service";
import type {
  AgentsAgent,
  AgentsTask,
  TaskPriority,
  TaskStatus,
} from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import {
  errorMessage,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../lib/agents-ui";
import { TaskComments } from "./TaskComments";

type Props = { taskId: string };

export function TaskDetailPanel({ taskId }: Props) {
  const base = useAgentsBasePath();
  const [task, setTask] = useState<AgentsTask | null>(null);
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const onError = useCallback((message: string) => setError(message), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskRow, agentRows] = await Promise.all([
        agentsApiService.getTask(taskId),
        agentsApiService.listAgents(),
      ]);
      setTask(taskRow);
      setAgents(agentRows);
    } catch (reason) {
      setError(errorMessage(reason));
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(partial: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeAgentId?: string | null;
  }) {
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      setTask(await agentsApiService.updateTask(task.id, partial));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <p className="text-sm text-destructive">{error || "Tarefa não encontrada."}</p>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`${base}/tasks`} className="text-sm text-muted-foreground hover:underline">
        ← Tarefas
      </Link>
      <h2 className="text-lg font-semibold">{task.title}</h2>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select
              value={task.status}
              disabled={saving}
              onChange={(e) => void patch({ status: e.target.value as TaskStatus })}
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade">
            <select
              value={task.priority}
              disabled={saving}
              onChange={(e) =>
                void patch({ priority: e.target.value as TaskPriority })
              }
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assignee">
            <select
              value={task.assigneeAgentId ?? ""}
              disabled={saving}
              onChange={(e) =>
                void patch({
                  assigneeAgentId: e.target.value || null,
                })
              }
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              <option value="">— nenhum —</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      {task.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{task.description}</p>
          </CardContent>
        </Card>
      )}

      <TaskComments
        taskId={task.id}
        assigneeAgentId={task.assigneeAgentId}
        onError={onError}
      />

      <Button variant="outline" size="sm" onClick={() => void load()} disabled={saving}>
        Recarregar
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
