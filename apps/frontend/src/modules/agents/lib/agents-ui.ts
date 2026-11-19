export {
  errorMessage,
  toAgentsOpError,
  type AgentsOpError,
  type AgentsOpErrorCode,
} from "./agents-op-error";

/** Labels de status para UI (valores enviados à API permanecem em inglês). */
const STATUS_LABELS_PT: Record<string, string> = {
  idle: "ocioso",
  active: "ativo",
  paused: "pausado",
  error: "erro",
  running: "em execução",
  queued: "na fila",
  succeeded: "sucesso",
  failed: "falhou",
  cancelled: "cancelado",
  canceled: "cancelado",
  backlog: "backlog",
  todo: "a fazer",
  in_progress: "em andamento",
  blocked: "bloqueado",
  done: "concluído",
  pending: "pendente",
  approved: "aprovado",
  rejected: "rejeitado",
  enabled: "ativado",
  disabled: "desativado",
  disconnected: "desconectado",
  connected: "conectado",
  low: "baixa",
  medium: "média",
  high: "alta",
  urgent: "urgente",
  day: "dia",
  week: "semana",
  month: "mês",
  plan: "plano",
  note: "nota",
  link: "link",
  output: "saída",
  file: "arquivo",
  execution: "execução",
  shared: "compartilhado",
  personal: "pessoal",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS_PT[status] ?? status.replaceAll("_", " ");
}

export const AGENT_STATUSES = ["idle", "active", "paused", "error"] as const;

export const AGENT_ADAPTER_OPTIONS = [
  { value: "stub", label: "Stub (runner local)", runtime: "in-process" },
  { value: "http_webhook", label: "Webhook HTTP", runtime: "connector" },
  { value: "claude", label: "Claude (config do harness)", runtime: "external" },
  { value: "cursor", label: "Cursor (config do harness)", runtime: "external" },
  { value: "codex", label: "Codex (config do harness)", runtime: "external" },
  { value: "gemini", label: "Gemini (config do harness)", runtime: "external" },
] as const;

export const AGENT_TOOL_KEYS = [
  "web_search",
  "http_fetch",
  "code_exec",
  "filesystem",
  "memory",
  "fleet_bridge",
] as const;
export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
