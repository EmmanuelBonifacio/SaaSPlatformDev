"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsComment } from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";
import { CommentBody } from "./CommentBody";

type Props = {
  taskId: string;
  assigneeAgentId: string | null;
  onError: (message: string) => void;
};

const ALLOWED_FILE =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export function TaskComments({ taskId, assigneeAgentId, onError }: Props) {
  const [comments, setComments] = useState<AgentsComment[]>([]);
  const [body, setBody] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const amountReais = Number(receiptAmount.replace(",", "."));
      const receipt =
        receiptAmount.trim() && Number.isFinite(amountReais) && amountReais >= 0
          ? {
              amountCents: Math.round(amountReais * 100),
              currency: "BRL",
              note: receiptNote.trim() || null,
            }
          : undefined;

      const created = await agentsApiService.createComment(taskId, {
        body: body.trim(),
        clientRequestId: crypto.randomUUID(),
        receipt,
      });

      if (pendingFile) {
        await agentsApiService.uploadCommentAttachment(
          taskId,
          created.id,
          pendingFile,
        );
      }

      if (assigneeAgentId) {
        await agentsApiService.createRun(assigneeAgentId, { taskId });
      }
      setBody("");
      setReceiptAmount("");
      setReceiptNote("");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
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
            <CommentBody
              body={comment.body}
              attachments={comment.attachments}
            />
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não há comentários.
          </p>
        )}
      </div>
      <form onSubmit={send} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          rows={3}
          aria-label="Comentário na tarefa"
          placeholder="Markdown: **negrito**, listas, `código`, links..."
          className="w-full resize-y rounded-md border bg-background p-2 text-sm"
        />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Receipt (R$)
            <input
              type="text"
              inputMode="decimal"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(e.target.value)}
              placeholder="0,00"
              className="mt-1 block w-24 rounded-md border bg-background px-2 py-1 text-sm"
              aria-label="Valor do receipt"
            />
          </label>
          <label className="min-w-[8rem] flex-1 text-xs text-muted-foreground">
            Nota
            <input
              type="text"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              maxLength={500}
              placeholder="opcional"
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm"
              aria-label="Nota do receipt"
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_FILE}
            className="sr-only"
            aria-label="Anexar arquivo"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Anexar imagem ou PDF"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            disabled={sending || !body.trim()}
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {pendingFile ? (
          <p className="text-xs text-muted-foreground">
            Anexo: {pendingFile.name} ({Math.ceil(pendingFile.size / 1024)} KB)
          </p>
        ) : null}
      </form>
    </div>
  );
}
