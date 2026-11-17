"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type {
  AgentsAgent,
  AgentsTask,
  TaskPriority,
  TaskStatus,
} from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";
import { TaskComments } from "./TaskComments";
import { TaskFieldsForm } from "./TaskFieldsForm";

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
      <p className="text-sm text-destructive">
        {error || "Task not found."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={task.title}
        description="Task detail — status, priority, assignee, comments."
        actions={
          <>
            <StatusChip kind="task" status={task.status} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/tasks`}>All tasks</Link>
            </Button>
          </>
        }
      />

      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskFieldsForm
            task={task}
            agents={agents}
            saving={saving}
            onPatch={(partial) => void patch(partial)}
          />
        </CardContent>
      </Card>

      {task.description ? (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{task.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <TaskComments
        taskId={task.id}
        assigneeAgentId={task.assigneeAgentId}
        onError={onError}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => void load()}
        disabled={saving}
      >
        Reload
      </Button>
    </div>
  );
}
