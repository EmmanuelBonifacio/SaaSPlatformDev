"use client";

import { cn } from "@/lib/utils";

const AGENT_HUES: Record<string, string> = {
  idle: "var(--status-agent-idle)",
  active: "var(--status-agent-active)",
  paused: "var(--status-agent-paused)",
  error: "var(--status-agent-error)",
  running: "var(--status-agent-running)",
};

const TASK_HUES: Record<string, string> = {
  backlog: "var(--status-task-backlog)",
  todo: "var(--status-task-todo)",
  in_progress: "var(--status-task-in_progress)",
  blocked: "var(--status-task-blocked)",
  done: "var(--status-task-done)",
  cancelled: "var(--status-task-cancelled)",
};

type Props = {
  kind: "agent" | "task" | "generic";
  status: string;
  className?: string;
};

export function StatusChip({ kind, status, className }: Props) {
  const hue =
    kind === "agent"
      ? AGENT_HUES[status] ?? "var(--status-agent-idle)"
      : kind === "task"
        ? TASK_HUES[status] ?? "var(--status-task-backlog)"
        : "hsl(var(--muted-foreground))";

  return (
    <span
      className={cn("agents-status-chip", className)}
      style={{ ["--chip-hue" as string]: hue }}
    >
      <span className="agents-status-dot" aria-hidden />
      {status.replaceAll("_", " ")}
    </span>
  );
}
