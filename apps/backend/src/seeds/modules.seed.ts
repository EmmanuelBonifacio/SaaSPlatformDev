// =============================================================================
// src/seeds/modules.seed.ts — SaaS Core Registry Template
// =============================================================================
// Registro canônico de todos os módulos da plataforma SaaS Core.
// Adicione novos módulos a este array à medida que forem desenvolvidos.
// =============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const MODULE_REGISTRY = [
  {
    name: "finia",
    displayName: "FinIA",
    description: "Assistente financeiro pessoal inteligente via WhatsApp com IA",
    visivel: true,
    emBreve: false,
    beta: false,
    icone: "Sparkles",
  },
  {
    name: "exemplo_modulo",
    displayName: "Módulo Exemplo",
    description: "Módulo modelo para criação de novas funcionalidades no SaaS",
    visivel: false,
    emBreve: true,
    beta: false,
    icone: "Package",
  },
] as const;

export type ModuleName = (typeof MODULE_REGISTRY)[number]["name"];

export function getModuleDefaults(name: string) {
  const entry = MODULE_REGISTRY.find((m) => m.name === name);
  return {
    visivel: entry?.visivel ?? true,
    emBreve: entry?.emBreve ?? false,
    beta: entry?.beta ?? false,
  };
}

async function seedModules() {
  console.log("Seeding modules...");

  for (const mod of MODULE_REGISTRY) {
    await prisma.$executeRaw`
      INSERT INTO modules (id, name, display_name, description, icone, created_at)
      VALUES (gen_random_uuid(), ${mod.name}, ${mod.displayName}, ${mod.description}, ${mod.icone}, NOW())
      ON CONFLICT (name) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            description  = EXCLUDED.description,
            icone        = EXCLUDED.icone
    `;
    console.log(`  ✓ ${mod.name} (${mod.displayName})`);
  }

  console.log("Done.");
}

seedModules()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
