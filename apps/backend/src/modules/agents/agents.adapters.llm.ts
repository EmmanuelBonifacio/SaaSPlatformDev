/**
 * Adapters HTTP para Claude (Anthropic) e Codex (OpenAI).
 * Secrets via store criptografado (preferência) ou process.env — nunca no código.
 */

import {
  buildRunPrompt,
  resolveSecretValue,
  type AdapterContext,
  type AgentAdapter,
  type AdapterResult,
  type HeartbeatFn,
} from "./agents.adapters.shared";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_CODEX_MODEL = "gpt-4o-mini";
const LLM_TIMEOUT_MS = 45_000;

type Usage = { inputTokens: number; outputTokens: number };

function estimateClaudeCents(usage: Usage): number {
  const inCents = (usage.inputTokens / 1_000_000) * 300;
  const outCents = (usage.outputTokens / 1_000_000) * 1500;
  return Math.max(1, Math.ceil(inCents + outCents));
}

function estimateOpenAiCents(usage: Usage): number {
  const inCents = (usage.inputTokens / 1_000_000) * 15;
  const outCents = (usage.outputTokens / 1_000_000) * 60;
  return Math.max(1, Math.ceil(inCents + outCents));
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
    });
    const json = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return { ok: response.ok, status: response.status, json };
  } finally {
    clearTimeout(timer);
  }
}

function textFromAnthropic(json: Record<string, unknown>): string {
  const content = json.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block): block is { type: string; text?: string } =>
        !!block && typeof block === "object",
    )
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

function usageFromAnthropic(json: Record<string, unknown>): Usage {
  const usage = json.usage as
    | { input_tokens?: number; output_tokens?: number }
    | undefined;
  return {
    inputTokens: Number(usage?.input_tokens ?? 0),
    outputTokens: Number(usage?.output_tokens ?? 0),
  };
}

function textFromOpenAi(json: Record<string, unknown>): string {
  const choices = json.choices;
  if (!Array.isArray(choices) || !choices[0]) return "";
  const message = (choices[0] as { message?: { content?: string } }).message;
  return (message?.content ?? "").trim();
}

function usageFromOpenAi(json: Record<string, unknown>): Usage {
  const usage = json.usage as
    | { prompt_tokens?: number; completion_tokens?: number }
    | undefined;
  return {
    inputTokens: Number(usage?.prompt_tokens ?? 0),
    outputTokens: Number(usage?.completion_tokens ?? 0),
  };
}

function fail(
  summary: string,
  errorMessage: string,
  ctx: AdapterContext,
): AdapterResult {
  return {
    ok: false,
    summary,
    errorMessage: errorMessage.slice(0, 200),
    commentBody: ctx.taskId
      ? `[run ${ctx.runId.slice(0, 8)}] ${summary}`
      : undefined,
  };
}

export const claudeHttpAdapter: AgentAdapter = {
  type: "claude",
  async execute(ctx, heartbeat) {
    return runClaude(ctx, heartbeat);
  },
};

export const codexHttpAdapter: AgentAdapter = {
  type: "codex",
  async execute(ctx, heartbeat) {
    return runCodex(ctx, heartbeat);
  },
};

async function runClaude(
  ctx: AdapterContext,
  heartbeat: HeartbeatFn,
): Promise<AdapterResult> {
  await heartbeat("resolving_secrets");
  const apiKey = resolveSecretValue(ctx.secretRefs, [
    "ANTHROPIC_API_KEY",
    "CLAUDE_API_KEY",
  ]);
  if (!apiKey) {
    return fail(
      "Claude: ANTHROPIC_API_KEY ausente (secret ref ou env).",
      "Missing ANTHROPIC_API_KEY",
      ctx,
    );
  }

  await heartbeat("calling_claude");
  const model = ctx.harness.model?.trim() || DEFAULT_CLAUDE_MODEL;
  const maxTokens = Math.min(
    4096,
    Math.max(256, (ctx.harness.maxTurns ?? 8) * 256),
  );
  try {
    const { ok, status, json } = await postJson(
      ANTHROPIC_URL,
      {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      {
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: buildRunPrompt(ctx) }],
      },
    );
    if (!ok) {
      return fail(`Claude HTTP ${status}.`, `Anthropic HTTP ${status}`, ctx);
    }
    const text = textFromAnthropic(json);
    if (!text) {
      return fail("Claude respondeu sem texto.", "EmptyClaudeResponse", ctx);
    }
    await heartbeat("claude_ok");
    const usage = usageFromAnthropic(json);
    const summary = `Claude (${model}): ${text.slice(0, 500)}`;
    return {
      ok: true,
      summary,
      spendCents: estimateClaudeCents(usage),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      provider: "anthropic",
      model,
      commentBody: ctx.taskId
        ? `[run ${ctx.runId.slice(0, 8)}] ${summary}`
        : undefined,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "ClaudeRequestFailed";
    return fail("Falha ao chamar Anthropic.", name, ctx);
  }
}

async function runCodex(
  ctx: AdapterContext,
  heartbeat: HeartbeatFn,
): Promise<AdapterResult> {
  await heartbeat("resolving_secrets");
  const apiKey = resolveSecretValue(ctx.secretRefs, [
    "OPENAI_API_KEY",
    "CODEX_API_KEY",
  ]);
  if (!apiKey) {
    return fail(
      "Codex: OPENAI_API_KEY ausente (secret ref ou env).",
      "Missing OPENAI_API_KEY",
      ctx,
    );
  }

  await heartbeat("calling_codex");
  const model = ctx.harness.model?.trim() || DEFAULT_CODEX_MODEL;
  try {
    const { ok, status, json } = await postJson(
      OPENAI_URL,
      { authorization: `Bearer ${apiKey}` },
      {
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content:
              "You are a coding agent. Respond briefly with concrete next steps.",
          },
          { role: "user", content: buildRunPrompt(ctx) },
        ],
      },
    );
    if (!ok) {
      return fail(`Codex HTTP ${status}.`, `OpenAI HTTP ${status}`, ctx);
    }
    const text = textFromOpenAi(json);
    if (!text) {
      return fail("Codex respondeu sem texto.", "EmptyCodexResponse", ctx);
    }
    await heartbeat("codex_ok");
    const usage = usageFromOpenAi(json);
    const summary = `Codex (${model}): ${text.slice(0, 500)}`;
    return {
      ok: true,
      summary,
      spendCents: estimateOpenAiCents(usage),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      provider: "openai",
      model,
      commentBody: ctx.taskId
        ? `[run ${ctx.runId.slice(0, 8)}] ${summary}`
        : undefined,
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "CodexRequestFailed";
    return fail("Falha ao chamar OpenAI/Codex.", name, ctx);
  }
}
