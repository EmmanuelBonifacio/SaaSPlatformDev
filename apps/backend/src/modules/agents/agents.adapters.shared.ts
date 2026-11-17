/**
 * Tipos e helpers compartilhados dos adapters (sem imports cíclicos).
 */

import type { AgentHarness } from "./agents.types";

export type AdapterSecretRef = {
  name: string;
  envRef: string;
};

export type AdapterContext = {
  schemaName: string;
  runId: string;
  agentId: string;
  agentName: string;
  adapterType: string;
  taskId: string | null;
  taskTitle: string | null;
  taskDescription: string | null;
  instructions: string | null;
  harness: AgentHarness;
  secretRefs: AdapterSecretRef[];
  webhook?: {
    url: string;
    host: string;
    secretEnv: string | null;
  } | null;
};

export type AdapterResult = {
  ok: boolean;
  summary: string;
  errorMessage?: string;
  commentBody?: string;
  spendCents?: number;
};

export type HeartbeatFn = (phase: string) => Promise<void>;

export type AgentAdapter = {
  type: string;
  execute: (
    ctx: AdapterContext,
    heartbeat: HeartbeatFn,
  ) => Promise<AdapterResult>;
};

export function resolveSecretValue(
  refs: AdapterSecretRef[],
  preferredEnvRefs: string[],
): string | null {
  for (const preferred of preferredEnvRefs) {
    const hit = refs.find(
      (r) => r.envRef === preferred || r.name.toUpperCase() === preferred,
    );
    if (hit) {
      const value = process.env[hit.envRef];
      if (value && value.trim()) return value.trim();
    }
  }
  for (const preferred of preferredEnvRefs) {
    const value = process.env[preferred];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

export function buildRunPrompt(ctx: AdapterContext): string {
  const parts = [
    `Agent: ${ctx.agentName}`,
    ctx.instructions ? `Instructions:\n${ctx.instructions.slice(0, 8000)}` : null,
    ctx.taskTitle ? `Task: ${ctx.taskTitle}` : null,
    ctx.taskDescription
      ? `Description:\n${ctx.taskDescription.slice(0, 8000)}`
      : null,
    `Run ID: ${ctx.runId}`,
    "Responda de forma objetiva com o resultado ou próximos passos.",
  ];
  return parts.filter(Boolean).join("\n\n");
}

/** Bloqueia loopback; hosts Docker internos são permitidos. */
export function buildWebhookUrl(
  host: string,
  path = "/hooks/agents/run",
): string | null {
  const trimmed = host.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(path, trimmed.endsWith("/") ? trimmed : `${trimmed}/`);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    return null;
  }
  return parsed.toString();
}
