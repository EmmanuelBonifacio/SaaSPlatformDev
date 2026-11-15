import { describe, expect, it, vi } from "vitest";
import { createAgentClient } from "../src/create-agent-client";
import { AgentClientError } from "../src/errors";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createAgentClient", () => {
  it("rejects apiKey mode without key", () => {
    expect(() =>
      createAgentClient({
        baseUrl: "http://127.0.0.1:3100",
        authMode: "apiKey",
      }),
    ).toThrow(AgentClientError);
  });

  it("rejects mixing apiKey with local_trusted", () => {
    expect(() =>
      createAgentClient({
        baseUrl: "http://127.0.0.1:3100",
        authMode: "local_trusted",
        apiKey: "pcp_sdk_test",
      }),
    ).toThrow(/local_trusted/);
  });

  it("sends Bearer apiKey and lists agents", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toBe("http://127.0.0.1:3100/api/companies/co-1/agents");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer pcp_sdk_secret",
      });
      return jsonResponse([
        { id: "ag-1", name: "Alpha", role: "engineer", status: "idle" },
      ]);
    });

    const client = createAgentClient({
      baseUrl: "http://127.0.0.1:3100",
      apiKey: "pcp_sdk_secret",
      authMode: "apiKey",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const agents = await client.listAgents("co-1");
    expect(agents).toEqual([
      { id: "ag-1", name: "Alpha", role: "engineer", title: undefined, status: "idle" },
    ]);
  });

  it("omits Authorization in local_trusted mode", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      return jsonResponse({
        id: "task-1",
        title: "Hello",
        status: "todo",
        description: null,
      });
    });

    const client = createAgentClient({
      baseUrl: "http://127.0.0.1:3100",
      authMode: "local_trusted",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const task = await client.createTask("co-1", {
      title: "Hello",
      description: "world",
      status: "backlog",
    });
    expect(task.id).toBe("task-1");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("lists tasks from array or items envelope", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([{ id: "t1", title: "A", status: "todo" }]),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ id: "t2", title: "B", status: "backlog" }] }),
      );

    const client = createAgentClient({
      baseUrl: "http://paperclip.test",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect((await client.listTasks("c")).map((t) => t.id)).toEqual(["t1"]);
    expect((await client.listTasks("c")).map((t) => t.id)).toEqual(["t2"]);
  });

  it("creates comments and runs agent wakeup", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/comments")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          id: "c1",
          body: "ping",
          authorType: "user",
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      expect(url).toBe("http://paperclip.test/api/agents/ag-1/wakeup");
      expect(JSON.parse(String(init?.body))).toEqual({
        source: "on_demand",
        issueId: "task-9",
      });
      return jsonResponse({ id: "run-1", status: "queued" });
    });

    const client = createAgentClient({
      baseUrl: "http://paperclip.test",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const comment = await client.createComment("task-9", {
      body: "ping",
      clientRequestId: "req-1",
    });
    expect(comment.id).toBe("c1");

    const run = await client.runAgent("ag-1", { issueId: "task-9" });
    expect(run).toEqual({ id: "run-1", status: "queued" });
  });

  it("maps upstream failures to AgentClientError", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "nope" }, 401));
    const client = createAgentClient({
      baseUrl: "http://paperclip.test",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.getAgent("ag-1")).rejects.toMatchObject({
      name: "AgentClientError",
      causeStatus: 401,
    });
  });
});
