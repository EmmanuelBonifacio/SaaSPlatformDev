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
  createConnectorSchema,
  createSecretRefSchema,
  createSkillSchema,
  createTaskSchema,
  decideApprovalSchema,
  listActivityQuerySchema,
  listRunsQuerySchema,
  paginationSchema,
  runIdParamSchema,
  publishSkillVersionSchema,
  updateBudgetSchema,
  upsertToolSchema,
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
      listActivityQuerySchema.safeParse({
        entityType: "task",
        entityId: "00000000-0000-4000-8000-000000000003",
      }).success,
    ).toBe(true);
    expect(
      runIdParamSchema.safeParse({
        runId: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
  });

  it("valida skills e connectors sem secretos", () => {
    expect(
      createSkillSchema.safeParse({
        name: "Route planning",
        instructions: "Prefer GraphHopper",
      }).success,
    ).toBe(true);
    expect(createSkillSchema.safeParse({ name: "" }).success).toBe(false);
    expect(
      createConnectorSchema.safeParse({
        name: "Traccar",
        kind: "fleet_traccar",
        config: { host: "http://traccar:8082" },
        secretRef: "TRACCAR_PASSWORD",
      }).success,
    ).toBe(true);
    expect(
      createConnectorSchema.safeParse({
        name: "Bad",
        kind: "webhook",
        secretRef: "not-an-env",
      }).success,
    ).toBe(false);
  });

  it("valida secret refs, tools e budgets do AgentDetail", () => {
    expect(
      createAgentSchema.safeParse({
        name: "Ops",
        adapterType: "claude",
        instructions: "Be concise",
        harness: { model: "claude-sonnet", maxTurns: 20 },
      }).success,
    ).toBe(true);
    expect(
      createSecretRefSchema.safeParse({
        name: "LLM key",
        envRef: "ANTHROPIC_API_KEY",
      }).success,
    ).toBe(true);
    expect(
      createSecretRefSchema.safeParse({
        name: "bad",
        envRef: "sk-live-secret",
      }).success,
    ).toBe(false);
    expect(
      upsertToolSchema.safeParse({ toolKey: "web_search", enabled: true })
        .success,
    ).toBe(true);
    expect(
      updateBudgetSchema.safeParse({
        period: "month",
        softLimitCents: 5000,
        hardLimitCents: 10000,
      }).success,
    ).toBe(true);
    expect(
      publishSkillVersionSchema.safeParse({
        instructions: "v2",
        changelog: "tune routing",
      }).success,
    ).toBe(true);
  });
});
