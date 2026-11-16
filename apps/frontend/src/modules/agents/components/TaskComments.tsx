"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsComment } from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";

type Props = {
  taskId: string;
  assigneeAgentId: string | null;
  onError: (message: string) => void;
};

export function TaskComments({ taskId, assigneeAgentId, onError }: Props) {
  const [comments, setComments] = useState<AgentsComment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await agentsApiService.listComments(taskId);
        if (active) setComments(rows);
      } catch (reason) {
        if (active) onError(errorMessage(reason));
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [taskId, onError]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await agentsApiService.createComment(taskId, {
        body: body.trim(),
        clientRequestId: crypto.randomUUID(),
      });
      if (assigneeAgentId) {
        await agentsApiService.createRun(assigneeAgentId, { taskId });
      }
      setBody("");
      setComments(await agentsApiService.listComments(taskId));
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Comentários</h3>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border p-3">
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
            <p className="whitespace-pre-wrap break-words">{comment.body}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Ainda não há comentários.</p>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          rows={2}
          aria-label="Comentário na tarefa"
          placeholder="Escreva um comentário..."
          className="min-w-0 flex-1 resize-y rounded-md border bg-background p-2 text-sm"
        />
        <Button type="submit" disabled={sending || !body.trim()} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
