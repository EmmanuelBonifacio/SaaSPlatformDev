"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Bot, LoaderCircle, MessageSquare, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type {
  AgentsAgent,
  AgentsComment,
  AgentsTask,
} from "@/types/agents.types";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

/**
 * Dashboard nativo de agentes (SP-7): só /agents.
 * Tarefa privada + comentários substituem a antiga "conversa" Paperclip.
 */
export function AgentsDashboard() {
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [comments, setComments] = useState<AgentsComment[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [agentRows, taskRows] = await Promise.all([
        agentsApiService.listAgents(),
        agentsApiService.listTasks(),
      ]);
      setAgents(agentRows);
      setTasks(taskRows);
      setSelectedAgentId((current) => current || agentRows[0]?.id || "");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      // Sempre libera o spinner (Axios timeout 15s cobre hang de rede).
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
  const threadTasks = tasks.filter(
    (task) =>
      task.visibility === "private" ||
      task.assigneeAgentId === selectedAgentId,
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-violet-600" />
            Agentes de IA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Runtime nativo do SaaS (`/agents`). Sem API Paperclip externa.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Agentes ({agents.length})</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`rounded-lg border p-3 text-left ${
                      selectedAgentId === agent.id
                        ? "border-primary"
                        : "border-border"
                    }`}
                  >
                    <span className="font-medium">{agent.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {agent.title || agent.role || "Agente"} ·{" "}
                      {statusLabel(agent.status)}
                    </span>
                  </button>
                ))}
                {agents.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum agente neste tenant. Um admin precisa criar via API
                    `POST /agents`.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tarefas ({tasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left ${
                      selectedTaskId === task.id
                        ? "border-primary"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {statusLabel(task.status)}
                        {task.visibility === "private" ? " · privada" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {task.priority}
                    </span>
                  </button>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tarefa disponível.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="flex min-h-[34rem] flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Thread da tarefa
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {threadTasks.map((task) => (
                  <Button
                    key={task.id}
                    size="sm"
                    variant={
                      selectedTaskId === task.id ? "default" : "outline"
                    }
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    {task.title.slice(0, 28)}
                  </Button>
                ))}
              </div>

              {selectedTask ? (
                <>
                  <div className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`rounded-lg p-3 text-sm ${
                          comment.authorType === "user"
                            ? "ml-8 bg-primary/10"
                            : "mr-8 bg-muted"
                        }`}
                      >
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {comment.authorType === "user"
                            ? "Você"
                            : comment.authorType === "agent"
                              ? "Agente"
                              : "Sistema"}
                        </p>
                        <p className="whitespace-pre-wrap break-words">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Ainda não há comentários.
                      </p>
                    )}
                  </div>
                  <form onSubmit={sendComment} className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      maxLength={4000}
                      rows={2}
                      aria-label="Comentário na tarefa"
                      placeholder="Escreva um comentário..."
                      className="min-w-0 flex-1 resize-y rounded-md border bg-background p-2 text-sm"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      aria-label="Enviar comentário"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <form onSubmit={startTaskThread} className="space-y-3">
                  <label className="block space-y-1 text-sm">
                    <span>Agente</span>
                    <select
                      value={selectedAgentId}
                      onChange={(event) =>
                        setSelectedAgentId(event.target.value)
                      }
                      className="w-full rounded-md border bg-background p-2"
                      required
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <textarea
                    value={firstMessage}
                    onChange={(event) => setFirstMessage(event.target.value)}
                    maxLength={4000}
                    rows={5}
                    aria-label="Primeira mensagem"
                    placeholder="Descreva o que você precisa..."
                    className="w-full resize-y rounded-md border bg-background p-2 text-sm"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={
                      sending || agents.length === 0 || !firstMessage.trim()
                    }
                  >
                    {sending ? "Criando..." : "Abrir tarefa com o agente"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
