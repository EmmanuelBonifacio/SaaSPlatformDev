export {
  errorMessage,
  toAgentsOpError,
  type AgentsOpError,
  type AgentsOpErrorCode,
} from "./agents-op-error";

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export const AGENT_STATUSES = ["idle", "active", "paused", "error"] as const;

export const AGENT_ADAPTER_OPTIONS = [
  { value: "stub", label: "Stub (local runner)", runtime: "in-process" },
  { value: "http_webhook", label: "HTTP webhook", runtime: "connector" },
  { value: "claude", label: "Claude (harness config)", runtime: "external" },
  { value: "cursor", label: "Cursor (harness config)", runtime: "external" },
  { value: "codex", label: "Codex (harness config)", runtime: "external" },
  { value: "gemini", label: "Gemini (harness config)", runtime: "external" },
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
