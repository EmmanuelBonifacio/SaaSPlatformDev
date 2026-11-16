import { describe, expect, it } from "vitest";
import { buildClientsTenantSchemaSQL } from "./clients-tenant-schema";

describe("buildClientsTenantSchemaSQL", () => {
  it("gera SQL idempotente com unique em match_key", () => {
    const statements = buildClientsTenantSchemaSQL("tenant_acme");
    expect(statements.some((s) => s.includes('"tenant_acme".crm_clients'))).toBe(
      true,
    );
    expect(
      statements.some((s) => s.includes("crm_clients_match_key_unique")),
    ).toBe(true);
  });

  it("rejeita schema inválido", () => {
    expect(() =>
      buildClientsTenantSchemaSQL('tenant"; DROP SCHEMA public;--'),
    ).toThrow(/inválido/);
  });
});
