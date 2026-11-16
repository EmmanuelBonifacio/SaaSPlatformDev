import { describe, expect, it } from "vitest";
import {
  agentHasScope,
  canViewTask,
  isTenantAdmin,
  normalizeScopes,
} from "./agents.permissions";
import {
  createAgentSchema,
  createCommentSchema,
  createTaskSchema,
  decideApprovalSchema,
  listActivityQuerySchema,
  listRunsQuerySchema,
  paginationSchema,
  runIdParamSchema,
} from "./agents.schema";

describe("agents permissions", () => {
  it("normaliza escopos para allowlist V1", () => {
    expect(normalizeScopes(["agents:run", "evil:root", 1])).toEqual([
      "agents:run",
    ]);
    expect(normalizeScopes(null).length).toBeGreaterThan(0);
  });

  it("aplica least privilege de capability", () => {
    expect(agentHasScope(["agents:read"], "agents:run")).toBe(false);
    expect(agentHasScope(["agents:run"], "agents:run")).toBe(true);
  });

  it("esconde tarefas privadas de outros usuários", () => {
    const actor = { userId: "u1", role: "user" as const };
    expect(
      canViewTask(actor, {
        visibility: "private",
        createdByUserId: "u2",
      }),
    ).toBe(false);
    expect(
      canViewTask(actor, {
        visibility: "private",
        createdByUserId: "u1",
      }),
    ).toBe(true);
    expect(
      canViewTask(
        { userId: "u1", role: "admin" },
        { visibility: "private", createdByUserId: "u2" },
      ),
    ).toBe(true);
    expect(isTenantAdmin({ userId: "x", role: "user" })).toBe(false);
  });
});

describe("agents schemas", () => {
  it("valida criação de agente/tarefa/comentário", () => {
    expect(
      createAgentSchema.safeParse({ name: "Ops", role: "general" }).success,
    ).toBe(true);
    expect(createAgentSchema.safeParse({ name: "" }).success).toBe(false);
    expect(
      createTaskSchema.safeParse({ title: "Tarefa", visibility: "private" })
        .success,
    ).toBe(true);
    expect(
      createCommentSchema.safeParse({
        body: "ok",
        clientRequestId: "not-uuid",
      }).success,
    ).toBe(false);
    expect(
      decideApprovalSchema.safeParse({ decision: "approved" }).success,
    ).toBe(true);
  });

  it("limita paginação", () => {
    expect(paginationSchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(paginationSchema.parse({}).limit).toBe(25);
  });

  it("valida filtros de runs e activity", () => {
    expect(
      listRunsQuerySchema.safeParse({
        agentId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
    expect(listRunsQuerySchema.safeParse({ agentId: "bad" }).success).toBe(
      false,
    );
    expect(
      listActivityQuerySchema.safeParse({ limit: 10, offset: 0 }).success,
    ).toBe(true);
    expect(
      runIdParamSchema.safeParse({
        runId: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
  });
});
