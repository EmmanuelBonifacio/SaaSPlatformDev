/**
 * Registry mínimo de adapters do runner (SP-29).
 * Stub é o caminho padrão; webhook HTTP usa host do connector (secret só via env).
 */

export type AdapterContext = {
  schemaName: string;
  runId: string;
  agentId: string;
  agentName: string;
  adapterType: string;
  taskId: string | null;
  taskTitle: string | null;
  taskDescription: string | null;
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
};

export type HeartbeatFn = (phase: string) => Promise<void>;

export type AgentAdapter = {
  type: string;
  execute: (
    ctx: AdapterContext,
    heartbeat: HeartbeatFn,
  ) => Promise<AdapterResult>;
};

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
    const note = adapterSupportsType(ctx.adapterType)
      ? ""
      : ` Adapter "${ctx.adapterType}" ainda sem harness nativo — executado via stub.`;
    const summary = `Stub concluiu run ${ctx.runId.slice(0, 8)} para ${ctx.agentName} (${taskBit}).${note}`;
    return {
      ok: true,
      summary,
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

/** Bloqueia loopback; hosts Docker internos (ex.: traccar) são permitidos. */
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

export function resolveAdapter(adapterType: string): AgentAdapter {
  const key = adapterType.trim().toLowerCase();
  if (key === "http_webhook" || key === "webhook") return webhookAdapter;
  return stubAdapter;
}

export function adapterSupportsType(adapterType: string): boolean {
  const key = adapterType.trim().toLowerCase();
  return (
    key === "stub" ||
    key === "echo" ||
    key === "http_webhook" ||
    key === "webhook"
  );
}
