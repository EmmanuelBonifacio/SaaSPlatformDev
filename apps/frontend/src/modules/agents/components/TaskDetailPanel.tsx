"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type {
  AgentsAgent,
  AgentsTask,
  TaskPriority,
  TaskStatus,
} from "@/types/agents.types";
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
import { TaskActivitySection } from "./TaskActivitySection";
import { TaskComments } from "./TaskComments";
import { TaskPlansArtifactsSection } from "./TaskPlansArtifactsSection";
import { TaskRunsSection } from "./TaskRunsSection";
import { TaskSidebar } from "./TaskSidebar";

type Props = { taskId: string };

export function TaskDetailPanel({ taskId }: Props) {
  const base = useAgentsBasePath();
  const [task, setTask] = useState<AgentsTask | null>(null);
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<AgentsOpError | null>(null);
  const [success, setSuccess] = useState("");
  const onError = useCallback((message: string) => {
    setError({ code: "unknown", message });
    setSuccess("");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRow, agentRows] = await Promise.all([
        agentsApiService.getTask(taskId),
        agentsApiService.listAgents(),
      ]);
      setTask(taskRow);
      setAgents(agentRows);
    } catch (reason) {
      setError(toAgentsOpError(reason));
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
    setError(null);
    try {
      setTask(await agentsApiService.updateTask(task.id, partial));
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function queueRun() {
    if (!task?.assigneeAgentId) return;
    setRunning(true);
    setError(null);
    setSuccess("");
    try {
      await agentsApiService.createRun(task.assigneeAgentId, {
        taskId: task.id,
      });
      setSuccess("Run dispatched to assignee (queued).");
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <AgentsLoadingState label="Loading task…" />;
  }

  if (!task) {
    return (
      <AgentsEmptyState
        title="Task unavailable"
        description={error?.message || "Task not found."}
        action={{ label: "Back to tasks", href: `${base}/tasks` }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={task.title}
        description="Issue detail — thread, status, runs, activity."
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
        <AgentsErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}
      {success ? (
        <AgentsSuccessAlert
          message={success}
          onDismiss={() => setSuccess("")}
        />
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          {task.description ? (
            <section className="space-y-2">
              <p className="agents-section-label">Description</p>
              <p className="whitespace-pre-wrap text-sm">{task.description}</p>
            </section>
          ) : null}

          <TaskComments
            taskId={task.id}
            assigneeAgentId={task.assigneeAgentId}
            onError={onError}
          />

          <TaskRunsSection
            taskId={task.id}
            refreshKey={refreshKey}
            onError={onError}
          />

          <TaskActivitySection
            taskId={task.id}
            refreshKey={refreshKey}
            onError={onError}
          />

          <TaskPlansArtifactsSection
            taskId={task.id}
            refreshKey={refreshKey}
            onError={onError}
          />
        </div>

        <TaskSidebar
          task={task}
          agents={agents}
          saving={saving}
          running={running}
          onPatch={(partial) => void patch(partial)}
          onRun={() => void queueRun()}
        />
      </div>
    </div>
  );
}
