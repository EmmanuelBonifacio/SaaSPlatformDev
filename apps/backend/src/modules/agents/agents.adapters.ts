/**
 * Registry de adapters do runner (SP-35).
 * Paths reais: stub, http_webhook, claude (HTTP), codex (HTTP), cursor (CLI).
 * Tipos sem harness nativo falham fechado — sem fallback silencioso para stub.
 */

import { claudeHttpAdapter, codexHttpAdapter } from "./agents.adapters.llm";
import { cursorCliAdapter } from "./agents.adapters.process";
import type {
  AdapterContext,
  AdapterResult,
  AgentAdapter,
  HeartbeatFn,
} from "./agents.adapters.shared";

export type {
  AdapterContext,
  AdapterResult,
  AdapterSecretRef,
  AgentAdapter,
  HeartbeatFn,
} from "./agents.adapters.shared";
export {
  buildRunPrompt,
  buildWebhookUrl,
  resolveSecretValue,
} from "./agents.adapters.shared";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Adapter local: avança fases com heartbeats e gera resumo/comentário. */
export const stubAdapter: AgentAdapter = {
  type: "stub",
  async execute(ctx, heartbeat) {
    await heartbeat("claimed");
    await sleep(25);
    await heartbeat("working");
    await sleep(25);
    await heartbeat("finalizing");
    const taskBit = ctx.taskTitle
      ? `task "${ctx.taskTitle.slice(0, 80)}"`
      : "sem task";
    const summary = `Stub concluiu run ${ctx.runId.slice(0, 8)} para ${ctx.agentName} (${taskBit}).`;
    return {
      ok: true,
      summary,
      spendCents: 0,
      commentBody: ctx.taskId
        ? `[run ${ctx.runId.slice(0, 8)}] ${summary}`
        : undefined,
    };
  },
};

/** Webhook: POST JSON do run; Authorization só se secretRef existir em process.env. */
export const webhookAdapter: AgentAdapter = {
  type: "http_webhook",
  async execute(ctx, heartbeat) {
    await heartbeat("resolving_connector");
    if (!ctx.webhook) {
      return {
        ok: false,
        summary: "Nenhum connector webhook habilitado.",
        errorMessage: "Connector webhook não configurado.",
      };
    }
    await heartbeat("calling_webhook");
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };
    if (ctx.webhook.secretEnv) {
      const token = process.env[ctx.webhook.secretEnv];
      if (token) headers.authorization = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(ctx.webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          runId: ctx.runId,
          agentId: ctx.agentId,
          taskId: ctx.taskId,
          taskTitle: ctx.taskTitle,
        }),
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) {
        return {
          ok: false,
          summary: `Webhook respondeu HTTP ${response.status}.`,
          errorMessage: `Webhook HTTP ${response.status}`,
        };
      }
      await heartbeat("webhook_ok");
      return {
        ok: true,
        summary: `Webhook ${ctx.webhook.host} aceitou o run.`,
        spendCents: 0,
        commentBody: ctx.taskId
          ? `[run ${ctx.runId.slice(0, 8)}] Webhook ${ctx.webhook.host} OK.`
          : undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.name : "WebhookRequestFailed";
      return {
        ok: false,
        summary: "Falha ao chamar webhook do connector.",
        errorMessage: message.slice(0, 200),
      };
    } finally {
      clearTimeout(timer);
    }
  },
};

function missingAdapter(type: string): AgentAdapter {
  return {
    type,
    async execute(ctx: AdapterContext, heartbeat: HeartbeatFn) {
      await heartbeat("adapter_missing");
      return {
        ok: false,
        summary: `Adapter "${type}" não disponível neste runtime SaaS.`,
        errorMessage: `Adapter ausente: ${type}`,
        commentBody: ctx.taskId
          ? `[run ${ctx.runId.slice(0, 8)}] Adapter "${type}" ausente — run falhou (fail-closed).`
          : undefined,
      } satisfies AdapterResult;
    },
  };
}

export function resolveAdapter(adapterType: string): AgentAdapter {
  const key = adapterType.trim().toLowerCase();
  if (key === "stub" || key === "echo") return stubAdapter;
  if (key === "http_webhook" || key === "webhook") return webhookAdapter;
  if (key === "claude") return claudeHttpAdapter;
  if (key === "codex" || key === "openai") return codexHttpAdapter;
  if (key === "cursor") return cursorCliAdapter;
  return missingAdapter(key || "unknown");
}

export function adapterSupportsType(adapterType: string): boolean {
  const key = adapterType.trim().toLowerCase();
  return (
    key === "stub" ||
    key === "echo" ||
    key === "http_webhook" ||
    key === "webhook" ||
    key === "claude" ||
    key === "codex" ||
    key === "openai" ||
    key === "cursor"
  );
}
