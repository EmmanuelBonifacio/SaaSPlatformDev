import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adapterSupportsType,
  buildWebhookUrl,
  resolveAdapter,
  stubAdapter,
} from "./agents.adapters";
import { claudeHttpAdapter, codexHttpAdapter } from "./agents.adapters.llm";
import { cursorCliAdapter } from "./agents.adapters.process";
import { isHardBudgetExceeded } from "./agents.repository.runner";

const baseCtx = {
  schemaName: "tenant_acme",
  runId: "00000000-0000-4000-8000-000000000099",
  agentId: "00000000-0000-4000-8000-000000000001",
  agentName: "Ops",
  adapterType: "stub",
  taskId: "00000000-0000-4000-8000-000000000002",
  taskTitle: "Checar rota",
  taskDescription: null,
  instructions: "Seja breve",
  harness: {},
  secretRefs: [] as Array<{ name: string; envRef: string }>,
};

describe("agents adapters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("resolveAdapter mapeia paths reais e falha fechado no resto", () => {
    expect(resolveAdapter("stub").type).toBe("stub");
    expect(resolveAdapter("claude").type).toBe("claude");
    expect(resolveAdapter("codex").type).toBe("codex");
    expect(resolveAdapter("cursor").type).toBe("cursor");
    expect(resolveAdapter("http_webhook").type).toBe("http_webhook");
    expect(resolveAdapter("gemini").type).toBe("gemini");
  });

  it("adapterSupportsType lista paths implementados", () => {
    expect(adapterSupportsType("stub")).toBe(true);
    expect(adapterSupportsType("webhook")).toBe(true);
    expect(adapterSupportsType("claude")).toBe(true);
    expect(adapterSupportsType("cursor")).toBe(true);
    expect(adapterSupportsType("gemini")).toBe(false);
  });

  it("buildWebhookUrl bloqueia loopback e aceita host de serviço", () => {
    expect(buildWebhookUrl("http://127.0.0.1:9000")).toBeNull();
    expect(buildWebhookUrl("not-a-url")).toBeNull();
    const url = buildWebhookUrl("http://webhook-svc:8080", "/hook");
    expect(url).toBe("http://webhook-svc:8080/hook");
  });

  it("stubAdapter emite heartbeats e resumo", async () => {
    const phases: string[] = [];
    const result = await stubAdapter.execute(
      { ...baseCtx, adapterType: "stub" },
      async (phase) => {
        phases.push(phase);
      },
    );
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Ops");
    expect(result.commentBody).toContain("Checar rota");
    expect(phases).toEqual(["claimed", "working", "finalizing"]);
  });

  it("missing adapter (gemini) falha fechado", async () => {
    const adapter = resolveAdapter("gemini");
    const result = await adapter.execute(
      { ...baseCtx, adapterType: "gemini" },
      async () => undefined,
    );
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("Adapter ausente");
  });

  it("claude falha sem API key", async () => {
    const result = await claudeHttpAdapter.execute(
      { ...baseCtx, adapterType: "claude" },
      async () => undefined,
    );
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("Missing ANTHROPIC_API_KEY");
  });

  it("claude HTTP ok com spend", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-anthropic";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: "text", text: "Rota OK" }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      })),
    );
    const phases: string[] = [];
    const result = await claudeHttpAdapter.execute(
      { ...baseCtx, adapterType: "claude", harness: { model: "claude-test" } },
      async (phase) => {
        phases.push(phase);
      },
    );
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Rota OK");
    expect(result.spendCents).toBeGreaterThan(0);
    expect(phases).toContain("calling_claude");
  });

  it("codex falha sem API key", async () => {
    const result = await codexHttpAdapter.execute(
      { ...baseCtx, adapterType: "codex" },
      async () => undefined,
    );
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("Missing OPENAI_API_KEY");
  });

  it("cursor CLI falha fechado quando binário ausente", async () => {
    const originalPath = process.env.PATH;
    process.env.PATH = "/tmp/empty-path-for-cursor-test";
    try {
      const result = await cursorCliAdapter.execute(
        { ...baseCtx, adapterType: "cursor" },
        async () => undefined,
      );
      expect(result.ok).toBe(false);
      expect(result.errorMessage).toBe("CursorCliUnavailable");
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it("isHardBudgetExceeded respeita hard limit", () => {
    expect(isHardBudgetExceeded(null)).toBe(false);
    expect(
      isHardBudgetExceeded({
        agentId: "a",
        period: "month",
        softLimitCents: null,
        hardLimitCents: 100,
        spentCents: 100,
        alertThresholdPct: 80,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toBe(true);
    expect(
      isHardBudgetExceeded({
        agentId: "a",
        period: "month",
        softLimitCents: null,
        hardLimitCents: 100,
        spentCents: 50,
        alertThresholdPct: 80,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toBe(false);
  });
});
