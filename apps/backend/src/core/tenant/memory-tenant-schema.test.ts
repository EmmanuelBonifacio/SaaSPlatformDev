import { describe, expect, it } from "vitest";
import { buildMemoryTenantSchemaSQL } from "./memory-tenant-schema";

describe("tenant memory schema definition", () => {
  it("creates isolated memory, settings, audit, and search structures", () => {
    const statements = buildMemoryTenantSchemaSQL("tenant_acme");
    const sql = statements.join("\n");

    expect(sql).toContain('"tenant_acme".agent_memories');
    expect(sql).toContain('"tenant_acme".agent_memory_settings');
    expect(sql).toContain('"tenant_acme".agent_memory_events');
    expect(sql).toContain("idx_agent_memories_search");
    expect(sql).toContain("scope = 'user' AND owner_user_id IS NOT NULL");
  });

  it("rejects unsafe schema identifiers before building DDL", () => {
    expect(() => buildMemoryTenantSchemaSQL('tenant"; DROP SCHEMA public;--'))
      .toThrow("Nome de schema inválido");
  });
});
