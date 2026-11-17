import { describe, expect, it } from "vitest";
import {
  adapterSupportsType,
  buildWebhookUrl,
  resolveAdapter,
  stubAdapter,
} from "./agents.adapters";

describe("agents adapters", () => {
  it("resolveAdapter cai no stub para tipos sem harness", () => {
    expect(resolveAdapter("stub").type).toBe("stub");
    expect(resolveAdapter("claude").type).toBe("stub");
    expect(resolveAdapter("http_webhook").type).toBe("http_webhook");
  });

  it("adapterSupportsType lista só paths implementados", () => {
    expect(adapterSupportsType("stub")).toBe(true);
    expect(adapterSupportsType("webhook")).toBe(true);
    expect(adapterSupportsType("cursor")).toBe(false);
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
      {
        schemaName: "tenant_acme",
        runId: "00000000-0000-4000-8000-000000000099",
        agentId: "00000000-0000-4000-8000-000000000001",
        agentName: "Ops",
        adapterType: "stub",
        taskId: "00000000-0000-4000-8000-000000000002",
        taskTitle: "Checar rota",
        taskDescription: null,
      },
      async (phase) => {
        phases.push(phase);
      },
    );
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Ops");
    expect(result.commentBody).toContain("Checar rota");
    expect(phases).toEqual(["claimed", "working", "finalizing"]);
  });
});
