"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import type {
  AgentsAgent,
  AgentsTask,
  TaskPriority,
  TaskStatus,
} from "@/types/agents.types";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  statusLabel,
} from "../lib/agents-ui";

type Props = {
  task: AgentsTask;
  agents: AgentsAgent[];
  saving: boolean;
  onPatch: (partial: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeAgentId?: string | null;
  }) => void;
};

export function TaskFieldsForm({ task, agents, saving, onPatch }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Status">
        <select
          value={task.status}
          disabled={saving}
          onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Prioridade">
        <select
          value={task.priority}
          disabled={saving}
          onChange={(e) =>
            onPatch({ priority: e.target.value as TaskPriority })
          }
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Responsável">
        <select
          value={task.assigneeAgentId ?? ""}
          disabled={saving}
          onChange={(e) =>
            onPatch({ assigneeAgentId: e.target.value || null })
          }
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          <option value="">— nenhum —</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
