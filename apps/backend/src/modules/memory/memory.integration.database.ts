import { buildMemoryTenantSchemaSQL } from "../../core/tenant/memory-tenant-schema";

export const MEMORY_TEST_TENANTS = [
  { id: "00000000-0000-4000-8000-000000000001", schema: "tenant_memory_test_a" },
  { id: "00000000-0000-4000-8000-000000000002", schema: "tenant_memory_test_b" },
] as const;

export const MEMORY_TEST_USERS = {
  admin: "10000000-0000-4000-8000-000000000001",
  owner: "10000000-0000-4000-8000-000000000002",
  other: "10000000-0000-4000-8000-000000000003",
  inactive: "10000000-0000-4000-8000-000000000004",
} as const;

export async function initializeMemoryTestDatabase() {
  const testDatabaseUrl = process.env.MEMORY_TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("MEMORY_TEST_DATABASE_URL não foi configurada.");
  }
  const url = new URL(testDatabaseUrl);
  if (
    url.protocol !== "postgresql:" ||
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    url.pathname !== "/saas_memory_test"
  ) {
    throw new Error(
      "MEMORY_TEST_DATABASE_URL deve apontar para localhost/loopback e para o banco saas_memory_test.",
    );
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  const { prisma, disconnectPrisma } = await import("../../core/database/prisma");
  const { memoryService } = await import("./memory.service");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id UUID PRIMARY KEY,
      schema_name TEXT NOT NULL UNIQUE
    )
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO public.tenants (id, schema_name)
    VALUES
      ('${MEMORY_TEST_TENANTS[0].id}', '${MEMORY_TEST_TENANTS[0].schema}'),
      ('${MEMORY_TEST_TENANTS[1].id}', '${MEMORY_TEST_TENANTS[1].schema}')
    ON CONFLICT (id) DO UPDATE SET schema_name = EXCLUDED.schema_name
  `);

  for (const tenant of MEMORY_TEST_TENANTS) {
    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${tenant.schema}" CASCADE`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE SCHEMA "${tenant.schema}"`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "${tenant.schema}".users (
        id UUID PRIMARY KEY,
        role TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      )`,
    );
    for (const statement of buildMemoryTenantSchemaSQL(tenant.schema)) {
      await prisma.$executeRawUnsafe(statement);
    }
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO "${MEMORY_TEST_TENANTS[0].schema}".users (id, role, is_active)
    VALUES
      ('${MEMORY_TEST_USERS.admin}', 'admin', true),
      ('${MEMORY_TEST_USERS.owner}', 'user', true),
      ('${MEMORY_TEST_USERS.other}', 'user', true),
      ('${MEMORY_TEST_USERS.inactive}', 'admin', false)
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "${MEMORY_TEST_TENANTS[1].schema}".users (id, role, is_active)
    VALUES ('${MEMORY_TEST_USERS.other}', 'user', true)
  `);

  return {
    memoryService,
    close: async () => {
      for (const tenant of MEMORY_TEST_TENANTS) {
        await prisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${tenant.schema}" CASCADE`,
        );
      }
      await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS public.tenants");
      await disconnectPrisma();
    },
  };
}
