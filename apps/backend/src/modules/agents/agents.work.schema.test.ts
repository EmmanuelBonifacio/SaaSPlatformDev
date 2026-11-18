import { describe, expect, it } from "vitest";
import {
  createCaseSchema,
  createWorkspaceSchema,
  updateCaseSchema,
} from "./agents.work.schema";

describe("agents work schemas — cases/workspaces", () => {
  it("createCaseSchema aceita payload mínimo e prioridade", () => {
    expect(createCaseSchema.parse({ name: "Incidente X" })).toMatchObject({
      name: "Incidente X",
    });
    expect(
      createCaseSchema.parse({
        name: "P1",
        priority: "urgent",
        status: "in_progress",
      }),
    ).toMatchObject({ priority: "urgent", status: "in_progress" });
  });

  it("createCaseSchema rejeita prioridade inválida", () => {
    expect(() =>
      createCaseSchema.parse({ name: "x", priority: "critical" }),
    ).toThrow();
  });

  it("createWorkspaceSchema kind/status", () => {
    expect(
      createWorkspaceSchema.parse({
        name: "Exec A",
        kind: "execution",
        workingDirectory: "/tmp/ws",
      }),
    ).toMatchObject({ kind: "execution", workingDirectory: "/tmp/ws" });
    expect(() =>
      createWorkspaceSchema.parse({ name: "bad", kind: "docker" }),
    ).toThrow();
  });

  it("updateCaseSchema exige ao menos um campo", () => {
    expect(() => updateCaseSchema.parse({})).toThrow();
    expect(updateCaseSchema.parse({ status: "resolved" })).toEqual({
      status: "resolved",
    });
  });
});
