"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AgentsAgent,
  AgentsTask,
  TaskPriority,
  TaskStatus,
} from "@/types/agents.types";
import { TASK_STATUSES } from "../lib/agents-ui";
import { TaskFieldsForm } from "./TaskFieldsForm";
import { StatusChip } from "./board/StatusChip";

type Props = {
  task: AgentsTask;
  agents: AgentsAgent[];
  saving: boolean;
  running: boolean;
  onPatch: (partial: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeAgentId?: string | null;
  }) => void;
  onRun: () => void;
};

export function TaskSidebar({
  task,
  agents,
  saving,
  running,
  onPatch,
  onRun,
}: Props) {
  return (
    <aside className="space-y-4 lg:w-72 lg:shrink-0">
      <div className="space-y-2">
        <p className="agents-section-label">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {TASK_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              disabled={saving || task.status === status}
              onClick={() => onPatch({ status })}
              className="disabled:opacity-50"
            >
              <StatusChip kind="task" status={status} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="agents-section-label">Campos</p>
        <TaskFieldsForm
          task={task}
          agents={agents}
          saving={saving}
          onPatch={onPatch}
        />
      </div>

      <div className="space-y-2">
        <p className="agents-section-label">Execução</p>
        <Button
          size="sm"
          variant="outline"
          disabled={!task.assigneeAgentId || running || saving}
          onClick={onRun}
        >
          <Play className="mr-2 h-3.5 w-3.5" />
          {running
            ? "Despachando…"
            : task.assigneeAgentId
              ? "Despachar execução"
              : "Atribua um agente primeiro"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Enfileira uma execução para o responsável (POST /agents/:id/runs). Você verá
          a confirmação acima quando tiver sucesso.
        </p>
      </div>
    </aside>
  );
}
