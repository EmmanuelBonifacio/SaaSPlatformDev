/**
 * Renomeia o módulo de catálogo `paperclip` → `agents` (SP-7).
 *
 * - Atualiza `public.modules.name` (tenant_modules usa module_id — sem mudança de FK)
 * - Idempotente: se já existe `agents` e sobra `paperclip`, reatribui tenant_modules e remove paperclip
 * - NÃO execute em produção sem backup + aprovação
 *
 * Uso:
 *   # dry-run
 *   npm run db:rename:module-agents
 *
 *   # aplicar
 *   CONFIRM_RENAME_MODULE_AGENTS=yes npm run db:rename:module-agents -- --apply
 */
import { disconnectPrisma, prisma } from "../src/core/database/prisma";

const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.env.CONFIRM_RENAME_MODULE_AGENTS === "yes";

async function renameCatalogModule(): Promise<void> {
  if (APPLY && !CONFIRMED) {
    throw new Error(
      "Recusado: defina CONFIRM_RENAME_MODULE_AGENTS=yes para aplicar.",
    );
  }

  const paperclip = await prisma.module.findUnique({
    where: { name: "paperclip" },
    select: { id: true, name: true, displayName: true },
  });
  const agents = await prisma.module.findUnique({
    where: { name: "agents" },
    select: { id: true, name: true },
  });

  console.info(
    `[ModuleRename] paperclip=${paperclip?.id ?? "ausente"} agents=${agents?.id ?? "ausente"} apply=${APPLY}`,
  );

  if (!paperclip && agents) {
    console.info("[ModuleRename] Já migrado (só agents existe). Nada a fazer.");
    return;
  }

  if (!paperclip && !agents) {
    console.info(
      "[ModuleRename] Nenhum registro paperclip/agents — rode o seed depois.",
    );
    return;
  }

  if (!APPLY) {
    console.info(
      "[ModuleRename] dry-run ok. Reexecute com CONFIRM_RENAME_MODULE_AGENTS=yes -- --apply.",
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (paperclip && !agents) {
      await tx.module.update({
        where: { id: paperclip.id },
        data: {
          name: "agents",
          displayName: "Agentes de IA",
          description:
            "Agentes nativos do SaaS via /agents (JWT + tenant schema).",
        },
      });
      console.info("[ModuleRename] Renomeado paperclip → agents.");
      return;
    }

    if (paperclip && agents) {
      const links = await tx.tenantModule.findMany({
        where: { moduleId: paperclip.id },
        select: { tenantId: true, isEnabled: true },
      });

      for (const link of links) {
        await tx.tenantModule.upsert({
          where: {
            tenantId_moduleId: {
              tenantId: link.tenantId,
              moduleId: agents.id,
            },
          },
          create: {
            tenantId: link.tenantId,
            moduleId: agents.id,
            isEnabled: link.isEnabled,
          },
          update: { isEnabled: link.isEnabled },
        });
      }

      await tx.tenantModule.deleteMany({ where: { moduleId: paperclip.id } });
      await tx.module.delete({ where: { id: paperclip.id } });
      console.info(
        `[ModuleRename] Reatribuídos ${links.length} tenant_modules; paperclip removido.`,
      );
    }
  });
}

renameCatalogModule()
  .catch((error: unknown) => {
    console.error(
      "[ModuleRename] Interrompido:",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
