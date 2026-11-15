"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Bot, LoaderCircle, MessageSquare, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { paperclipApiService } from "@/services/paperclip.service";
import type {
  PaperclipAgent,
  PaperclipConversation,
  PaperclipMessage,
  PaperclipTask,
} from "@/types/paperclip.types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export function PaperclipDashboard() {
  const [agents, setAgents] = useState<PaperclipAgent[]>([]);
  const [tasks, setTasks] = useState<PaperclipTask[]>([]);
  const [conversations, setConversations] = useState<PaperclipConversation[]>([]);
  const [messages, setMessages] = useState<PaperclipMessage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [agentRows, taskRows, conversationRows] = await Promise.all([
        paperclipApiService.listAgents(),
        paperclipApiService.listTasks(),
        paperclipApiService.listConversations(),
      ]);
      setAgents(agentRows);
      setTasks(taskRows);
      setConversations(conversationRows);
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
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    const loadMessages = async () => {
      try {
        const rows = await paperclipApiService.getMessages(selectedId);
        if (active) {
          setMessages(rows);
          setError("");
        }
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    };
    void loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgentId || !firstMessage.trim()) return;
    setSending(true);
    setError("");
    try {
      const conversation = await paperclipApiService.createConversation({
        agentId: selectedAgentId,
        clientRequestId: crypto.randomUUID(),
        message: firstMessage.trim(),
      });
      setFirstMessage("");
      setSelectedId(conversation.id);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !newMessage.trim()) return;
    setSending(true);
    setError("");
    try {
      await paperclipApiService.sendMessage(selectedId, {
        clientRequestId: crypto.randomUUID(),
        message: newMessage.trim(),
      });
      setNewMessage("");
      setMessages(await paperclipApiService.getMessages(selectedId));
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  const selectedConversation = conversations.find((item) => item.id === selectedId);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-violet-600" />
            Agentes de IA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os agentes e converse com eles pelo seu acesso SaaS.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
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
              <CardHeader><CardTitle>Agentes ({agents.length})</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`rounded-lg border p-3 text-left ${selectedAgentId === agent.id ? "border-primary" : "border-border"}`}
                  >
                    <span className="font-medium">{agent.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {agent.title || agent.role || "Agente"} · {statusLabel(agent.status)}
                    </span>
                  </button>
                ))}
                {agents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agente configurado nesta empresa.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tarefas recentes ({tasks.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.identifier ? `${task.identifier} · ` : ""}{statusLabel(task.status)}
                      </p>
                    </div>
                    {task.priority && <span className="shrink-0 text-xs text-muted-foreground">{task.priority}</span>}
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa disponível.</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="flex min-h-[34rem] flex-col">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Conversas</CardTitle></CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {conversations.map((conversation) => (
                  <Button
                    key={conversation.id}
                    size="sm"
                    variant={selectedId === conversation.id ? "default" : "outline"}
                    onClick={() => setSelectedId(conversation.id)}
                  >
                    {conversation.title}
                  </Button>
                ))}
              </div>

              {selectedConversation ? (
                <>
                  <div className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
                    {messages.map((message) => (
                      <div key={message.id} className={`rounded-lg p-3 text-sm ${message.author === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"}`}>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {message.author === "user" ? "Você" : message.author === "agent" ? "Agente" : "Sistema"}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                    ))}
                    {messages.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há mensagens.</p>}
                  </div>
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      maxLength={4000}
                      rows={2}
                      aria-label="Mensagem para o agente"
                      placeholder="Escreva sua mensagem..."
                      className="min-w-0 flex-1 resize-y rounded-md border bg-background p-2 text-sm"
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()} aria-label="Enviar mensagem">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <form onSubmit={startConversation} className="space-y-3">
                  <label className="block space-y-1 text-sm">
                    <span>Agente</span>
                    <select
                      value={selectedAgentId}
                      onChange={(event) => setSelectedAgentId(event.target.value)}
                      className="w-full rounded-md border bg-background p-2"
                      required
                    >
                      {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
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
                  <Button type="submit" disabled={sending || agents.length === 0 || !firstMessage.trim()}>
                    {sending ? "Iniciando..." : "Iniciar conversa"}
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
