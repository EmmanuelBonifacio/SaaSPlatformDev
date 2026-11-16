"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentsAgent, AgentsTask } from "@/types/agents.types";
import { statusLabel } from "../lib/agents-ui";

type Props = {
  base: string;
  agents: AgentsAgent[];
  tasks: AgentsTask[];
  selectedAgentId: string;
  selectedTaskId: string;
  onSelectAgent: (id: string) => void;
  onSelectTask: (id: string) => void;
};

export function DashboardLists({
  base,
  agents,
  tasks,
  selectedAgentId,
  selectedTaskId,
  onSelectAgent,
  onSelectTask,
}: Props) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agentes ({agents.length})</CardTitle>
          <Link href={`${base}/list`} className="text-xs text-primary hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.id)}
              className={`rounded-lg border p-3 text-left ${
                selectedAgentId === agent.id ? "border-primary" : "border-border"
              }`}
            >
              <span className="font-medium">{agent.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {agent.title || agent.role || "Agente"} · {statusLabel(agent.status)}
              </span>
            </button>
          ))}
          {agents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum agente.{" "}
              <Link href={`${base}/new`} className="text-primary hover:underline">
                Criar
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tarefas ({tasks.length})</CardTitle>
          <Link href={`${base}/tasks`} className="text-xs text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left ${
                selectedTaskId === task.id ? "border-primary" : "border-border"
              }`}
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
            </button>
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa disponível.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
