import { describe, expect, it } from "vitest";
import { buildDropPaperclipTenantSchemaSQL } from "./paperclip-tenant-schema";

describe("buildDropPaperclipTenantSchemaSQL", () => {
  it("emite DROP IF EXISTS para settings e conversations", () => {
    const sql = buildDropPaperclipTenantSchemaSQL("tenant_acme").join("\n");
    expect(sql).toContain(
      'DROP TABLE IF EXISTS "tenant_acme".paperclip_conversations CASCADE',
    );
    expect(sql).toContain(
      'DROP TABLE IF EXISTS "tenant_acme".paperclip_settings CASCADE',
    );
    expect(sql).not.toContain("CREATE TABLE");
  });
});
