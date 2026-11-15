/**
 * DROP opt-in das tabelas legadas paperclip_* em schemas tenant_* (SP-7).
 *
 * Segurança:
 * - NÃO roda sem CONFIRM_DROP_PAPERCLIP=yes
 * - Usa IF EXISTS (idempotente)
 * - NÃO execute em produção sem backup + aprovação explícita
 * - Dry-run padrão: lista tenants/SQL sem executar
 *
 * Uso:
 *   # dry-run (default)
 *   npm run db:drop:paperclip
 *
 *   # aplicar (dev/staging aprovado, com backup)
 *   CONFIRM_DROP_PAPERCLIP=yes npm run db:drop:paperclip -- --apply
 */
import {
  disconnectPrisma,
  prisma,
  withTenantSchema,
} from "../src/core/database/prisma";
import { buildDropPaperclipTenantSchemaSQL } from "../src/core/tenant/paperclip-tenant-schema";

const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.env.CONFIRM_DROP_PAPERCLIP === "yes";

async function dropPaperclipTables(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, schemaName: true },
    orderBy: { id: "asc" },
  });

  console.info(
    `[PaperclipDrop] ${tenants.length} tenant(s). apply=${APPLY} confirmed=${CONFIRMED}`,
  );
  console.info(
    "[PaperclipDrop] Backup recomendado antes de --apply (pg_dump por tenant/schema).",
  );

  if (APPLY && !CONFIRMED) {
    throw new Error(
      "Recusado: defina CONFIRM_DROP_PAPERCLIP=yes para aplicar DROPs.",
    );
  }

  const failedTenantIds: string[] = [];

  for (const tenant of tenants) {
    const statements = buildDropPaperclipTenantSchemaSQL(tenant.schemaName);
    if (!APPLY) {
      console.info(
        `[PaperclipDrop] dry-run ${tenant.schemaName}: ${statements.join("; ")}`,
      );
      continue;
    }

    try {
      await withTenantSchema(tenant.schemaName, async (tx) => {
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
      });
      console.info(`[PaperclipDrop] dropado: ${tenant.schemaName}`);
    } catch (error) {
      failedTenantIds.push(tenant.id);
      console.error(
        "[PaperclipDrop] Falha em tenant:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  if (failedTenantIds.length > 0) {
    throw new Error(
      `Falha ao dropar em ${failedTenantIds.length} de ${tenants.length} schemas.`,
    );
  }

  console.info(
    APPLY
      ? `[PaperclipDrop] Concluído em ${tenants.length} schema(s).`
      : "[PaperclipDrop] Dry-run ok. Reexecute com CONFIRM_DROP_PAPERCLIP=yes -- --apply para aplicar.",
  );
}

dropPaperclipTables()
  .catch((error: unknown) => {
    console.error(
      "[PaperclipDrop] Interrompido:",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
