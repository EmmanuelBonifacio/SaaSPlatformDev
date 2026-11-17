"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type {
  AgentsAgent,
  AgentsComment,
  AgentsLiveDashboard,
  AgentsTask,
} from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { useAgentsLiveSocket } from "../hooks/useAgentsLiveSocket";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { DashboardLists } from "./DashboardLists";
import { DashboardLiveStrip } from "./DashboardLiveStrip";
import { DashboardThread } from "./DashboardThread";

/**
 * Dashboard: agents + tasks + private-task thread (runtime nativo /agents).
 */
export function AgentsDashboard() {
  const base = useAgentsBasePath();
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [comments, setComments] = useState<AgentsComment[]>([]);
  const [liveOverride, setLiveOverride] = useState<AgentsLiveDashboard | null>(
    null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const { live: socketLive, socketMode } = useAgentsLiveSocket();
  const live = socketLive ?? liveOverride;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [agentRows, taskRows, liveDash] = await Promise.all([
        agentsApiService.listAgents(),
        agentsApiService.listTasks(),
        agentsApiService.getLiveDashboard(),
      ]);
      setAgents(agentRows);
      setTasks(taskRows);
      setLiveOverride(liveDash);
      setSelectedAgentId((current) => current || agentRows[0]?.id || "");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedTaskId) {
      setComments([]);
      return;
    }
    let active = true;
    const loadComments = async () => {
      try {
        const rows = await agentsApiService.listComments(selectedTaskId);
        if (active) {
          setComments(rows);
          setError("");
        }
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    };
    void loadComments();
    const timer = setInterval(loadComments, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedTaskId]);

  async function startTaskThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgentId || !firstMessage.trim()) return;
    setSending(true);
    setError("");
    try {
      const body = firstMessage.trim();
      const task = await agentsApiService.createTask({
        title: body.slice(0, 80) || "Nova tarefa",
        description: body,
        assigneeAgentId: selectedAgentId,
        visibility: "private",
      });
      await agentsApiService.createComment(task.id, {
        body,
        clientRequestId: crypto.randomUUID(),
      });
      await agentsApiService.createRun(selectedAgentId, { taskId: task.id });
      setFirstMessage("");
      setSelectedTaskId(task.id);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  async function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTaskId || !newMessage.trim()) return;
    setSending(true);
    setError("");
    try {
      await agentsApiService.createComment(selectedTaskId, {
        body: newMessage.trim(),
        clientRequestId: crypto.randomUUID(),
      });
      const task = tasks.find((item) => item.id === selectedTaskId);
      if (task?.assigneeAgentId) {
        await agentsApiService.createRun(task.assigneeAgentId, {
          taskId: selectedTaskId,
        });
      }
      setNewMessage("");
      setComments(await agentsApiService.listComments(selectedTaskId));
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  const selectedTask = tasks.find((item) => item.id === selectedTaskId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description="Live runs, heartbeats, agents, tasks, and a private thread."
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

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DashboardLiveStrip base={base} live={live} transport={socketMode} />

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
          <DashboardLists
            base={base}
            agents={agents}
            tasks={tasks}
            selectedAgentId={selectedAgentId}
            selectedTaskId={selectedTaskId}
            onSelectAgent={setSelectedAgentId}
            onSelectTask={setSelectedTaskId}
          />
          <DashboardThread
            agents={agents}
            selectedAgentId={selectedAgentId}
            selectedTask={selectedTask}
            comments={comments}
            firstMessage={firstMessage}
            newMessage={newMessage}
            sending={sending}
            onSelectAgent={setSelectedAgentId}
            onFirstMessage={setFirstMessage}
            onNewMessage={setNewMessage}
            onStart={startTaskThread}
            onSend={sendComment}
          />
        </div>
      )}
    </div>
  );
}
