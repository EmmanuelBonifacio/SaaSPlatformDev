import { describe, expect, it, vi } from "vitest";
import { AgentsSdkError, createAgentsClient } from "./client.js";

describe("createAgentsClient", () => {
  it("rejeita baseUrl com path ou credenciais", () => {
    expect(() =>
      createAgentsClient({
        baseUrl: "http://localhost:3000/agents",
        getAccessToken: () => "tok",
      }),
    ).toThrow(AgentsSdkError);
  });

  it("envia Bearer JWT SaaS para /agents (não Paperclip)", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([{ id: "a1", name: "Ops" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createAgentsClient({
      baseUrl: "http://127.0.0.1:3000",
      getAccessToken: async () => "saas.jwt.token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.listAgents({ limit: 10 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("http://127.0.0.1:3000/agents?limit=10");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer saas.jwt.token",
    });
  });

  it("propaga status HTTP da API nativa", async () => {
    const client = createAgentsClient({
      baseUrl: "http://127.0.0.1:3000",
      getAccessToken: () => "tok",
      fetchImpl: (async () =>
        new Response("{}", { status: 403 })) as unknown as typeof fetch,
    });
    await expect(client.listApprovals()).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
