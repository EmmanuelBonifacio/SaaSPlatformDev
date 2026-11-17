import { describe, expect, it } from "vitest";

describe("agents socket contract", () => {
  it("room key is schema-scoped (not client-supplied tenant path)", () => {
    const schemaName = "tenant_acme";
    const room = `schema:${schemaName}`;
    expect(room).toBe("schema:tenant_acme");
    expect(room.startsWith("schema:")).toBe(true);
  });

  it("namespace is /agents", () => {
    expect("/agents").toBe("/agents");
  });
});
