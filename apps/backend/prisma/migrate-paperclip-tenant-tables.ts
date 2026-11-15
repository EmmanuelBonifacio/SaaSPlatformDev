import {
  disconnectPrisma,
  prisma,
  withTenantSchema,
} from "../src/core/database/prisma";
import { buildPaperclipTenantSchemaSQL } from "../src/core/tenant/paperclip-tenant-schema";

async function migrateExistingTenants(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { name: true, schemaName: true },
    orderBy: { name: "asc" },
  });
  const failures: string[] = [];

  for (const tenant of tenants) {
    try {
      await withTenantSchema(tenant.schemaName, async (tx) => {
        for (const statement of buildPaperclipTenantSchemaSQL(tenant.schemaName)) {
          await tx.$executeRawUnsafe(statement);
        }
      });
      console.info(`[Paperclip] Schema preparado: ${tenant.schemaName}`);
    } catch (error) {
      failures.push(tenant.schemaName);
      console.error(
        `[Paperclip] Falha ao preparar ${tenant.schemaName}:`,
        error instanceof Error ? error.message : "erro desconhecido",
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(`Falha ao preparar ${failures.length} schema(s) de tenant.`);
  }
  console.info(`[Paperclip] ${tenants.length} schema(s) preparado(s).`);
}

migrateExistingTenants()
  .catch((error: unknown) => {
    console.error(
      "[Paperclip] Migração interrompida:",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
