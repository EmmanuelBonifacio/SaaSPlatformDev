import { describe, expect, it } from "vitest";
import { canViewTask } from "./agents.permissions";

describe("agents search visibility", () => {
  it("oculta tasks privadas de outros usuários na filtragem de hits", () => {
    const actor = { userId: "u1", role: "user" as const };
    expect(
      canViewTask(actor, {
        visibility: "open",
        createdByUserId: "other",
      }),
    ).toBe(true);
    expect(
      canViewTask(actor, {
        visibility: "private",
        createdByUserId: "other",
      }),
    ).toBe(false);
    expect(
      canViewTask(actor, {
        visibility: "private",
        createdByUserId: "u1",
      }),
    ).toBe(true);
  });
});
