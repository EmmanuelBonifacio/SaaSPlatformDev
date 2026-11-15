import { describe, expect, it, vi } from "vitest";

vi.mock("./agents.service", () => ({
  agentsService: {
    listAgents: vi.fn(async () => [{ id: "a1", name: "Ops" }]),
    createTask: vi.fn(async (_s, _u, _r, input: { title: string }) => ({
      id: "t1",
      title: input.title,
    })),
  },
}));

import { createAgentsInternalClient } from "./agents.client";
import { agentsService } from "./agents.service";

describe("createAgentsInternalClient", () => {
  it("delega ao agentsService in-process com contexto do tenant", async () => {
    const client = createAgentsInternalClient({
      schemaName: "tenant_acme",
      userId: "user-1",
      role: "admin",
    });
    await client.listAgents(10, 0);
    expect(agentsService.listAgents).toHaveBeenCalledWith(
      "tenant_acme",
      "user-1",
      "admin",
      10,
      0,
    );
    await client.createTask({ title: "Tarefa" });
    expect(agentsService.createTask).toHaveBeenCalledWith(
      "tenant_acme",
      "user-1",
      "admin",
      { title: "Tarefa" },
    );
  });
});
