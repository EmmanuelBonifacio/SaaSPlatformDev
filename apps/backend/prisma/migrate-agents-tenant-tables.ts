/**
 * Upgrade aditivo dos schemas tenant_* com tabelas nativas de agentes (SP-7).
 *
 * - Idempotente (CREATE IF NOT EXISTS)
 * - NÃO dropa paperclip_* nem dados existentes
 * - NÃO execute em produção sem backup + aprovação explícita
 *
 * Uso (dev/staging aprovado):
 *   npm run db:migrate:agents
 */
import {
  disconnectPrisma,
  prisma,
  withTenantSchema,
} from "../src/core/database/prisma";
import { buildAgentsTenantSchemaSQL } from "../src/core/tenant/agents-tenant-schema";

async function migrateExistingTenants(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, schemaName: true },
    orderBy: { id: "asc" },
  });
  const failedTenantIds: string[] = [];

  for (const tenant of tenants) {
    try {
      await withTenantSchema(tenant.schemaName, async (tx) => {
        for (const statement of buildAgentsTenantSchemaSQL(tenant.schemaName)) {
          await tx.$executeRawUnsafe(statement);
        }
      });
    } catch (error) {
      failedTenantIds.push(tenant.id);
      console.error(
        "[Agents] Falha ao preparar schema de tenant:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  if (failedTenantIds.length > 0) {
    throw new Error(
      `Falha ao preparar ${failedTenantIds.length} de ${tenants.length} schemas de tenant.`,
    );
  }
  console.info(`[Agents] ${tenants.length} schema(s) preparado(s).`);
}

migrateExistingTenants()
  .catch((error: unknown) => {
    console.error(
      "[Agents] Migração interrompida:",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
