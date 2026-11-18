"use client";

import type { FormEvent } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentsAgent, AgentsComment, AgentsTask } from "@/types/agents.types";
import { CommentBody } from "./CommentBody";

type Props = {
  agents: AgentsAgent[];
  selectedAgentId: string;
  selectedTask: AgentsTask | undefined;
  comments: AgentsComment[];
  firstMessage: string;
  newMessage: string;
  sending: boolean;
  onSelectAgent: (id: string) => void;
  onFirstMessage: (value: string) => void;
  onNewMessage: (value: string) => void;
  onStart: (event: FormEvent<HTMLFormElement>) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
};

export function DashboardThread(props: Props) {
  const {
    agents,
    selectedAgentId,
    selectedTask,
    comments,
    firstMessage,
    newMessage,
    sending,
    onSelectAgent,
    onFirstMessage,
    onNewMessage,
    onStart,
    onSend,
  } = props;

  return (
    <Card className="flex min-h-[34rem] flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Thread da tarefa
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {selectedTask ? (
          <ActiveThread
            comments={comments}
            newMessage={newMessage}
            sending={sending}
            onNewMessage={onNewMessage}
            onSend={onSend}
          />
        ) : (
          <StartThread
            agents={agents}
            selectedAgentId={selectedAgentId}
            firstMessage={firstMessage}
            sending={sending}
            onSelectAgent={onSelectAgent}
            onFirstMessage={onFirstMessage}
            onStart={onStart}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ActiveThread({
  comments,
  newMessage,
  sending,
  onNewMessage,
  onSend,
}: {
  comments: AgentsComment[];
  newMessage: string;
  sending: boolean;
  onNewMessage: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`rounded-lg p-3 text-sm ${
              comment.authorType === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"
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
          <p className="text-sm text-muted-foreground">Ainda não há comentários.</p>
        )}
      </div>
      <form onSubmit={onSend} className="flex gap-2">
        <textarea
          value={newMessage}
          onChange={(e) => onNewMessage(e.target.value)}
          maxLength={8000}
          rows={2}
          aria-label="Comentário na tarefa"
          placeholder="Escreva um comentário..."
          className="min-w-0 flex-1 resize-y rounded-md border bg-background p-2 text-sm"
        />
        <Button type="submit" disabled={sending || !newMessage.trim()} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}

function StartThread({
  agents,
  selectedAgentId,
  firstMessage,
  sending,
  onSelectAgent,
  onFirstMessage,
  onStart,
}: {
  agents: AgentsAgent[];
  selectedAgentId: string;
  firstMessage: string;
  sending: boolean;
  onSelectAgent: (id: string) => void;
  onFirstMessage: (value: string) => void;
  onStart: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onStart} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>Agente</span>
        <select
          value={selectedAgentId}
          onChange={(e) => onSelectAgent(e.target.value)}
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
        onChange={(e) => onFirstMessage(e.target.value)}
        maxLength={4000}
        rows={5}
        aria-label="Primeira mensagem"
        placeholder="Descreva o que você precisa..."
        className="w-full resize-y rounded-md border bg-background p-2 text-sm"
        required
      />
      <Button type="submit" disabled={sending || agents.length === 0 || !firstMessage.trim()}>
        {sending ? "Criando..." : "Abrir tarefa com o agente"}
      </Button>
    </form>
  );
}
