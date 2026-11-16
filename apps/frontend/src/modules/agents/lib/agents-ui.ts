export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Não foi possível concluir a operação.";
  }
  const message = error.message;
  if (/403|Forbidden|permiss/i.test(message)) {
    return "Sem permissão para esta operação (exige admin).";
  }
  if (/404|não encontrad|not found/i.test(message)) {
    return "Recurso não encontrado.";
  }
  return message || "Não foi possível concluir a operação.";
}

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export const AGENT_STATUSES = ["idle", "active", "paused", "error"] as const;
export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
