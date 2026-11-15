import {
  disconnectPrisma,
  prisma,
  withTenantSchema,
} from "../src/core/database/prisma";
import { buildMemoryTenantSchemaSQL } from "../src/core/tenant/memory-tenant-schema";

async function migrateExistingTenants(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, schemaName: true },
    orderBy: { id: "asc" },
  });
  const failedTenantIds: string[] = [];

  for (const tenant of tenants) {
    try {
      await withTenantSchema(tenant.schemaName, async (tx) => {
        for (const statement of buildMemoryTenantSchemaSQL(tenant.schemaName)) {
          await tx.$executeRawUnsafe(statement);
        }
      });
    } catch (error) {
      failedTenantIds.push(tenant.id);
      console.error(
        "[Memory] Falha ao preparar schema de tenant:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  if (failedTenantIds.length > 0) {
    throw new Error(
      `Falha ao preparar ${failedTenantIds.length} de ${tenants.length} schemas de tenant.`,
    );
  }
  console.info(`[Memory] ${tenants.length} schema(s) preparado(s).`);
}

migrateExistingTenants()
  .catch((error: unknown) => {
    console.error(
      "[Memory] Migração interrompida:",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
