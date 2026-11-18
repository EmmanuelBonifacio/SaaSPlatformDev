#!/usr/bin/env node
/**
 * Garante tenant demo + admin@demo.com no ambiente local (dev).
 * Pré-requisito: backend respondendo em http://127.0.0.1:3000
 *
 *   node scripts/ensure-demo-tenant.mjs
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(root, "apps", "backend");
const envPath = join(backendDir, ".env");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvFile(envPath);
process.chdir(backendDir);

const require = createRequire(join(backendDir, "package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const API = process.env.DEMO_API_BASE || "http://127.0.0.1:3000";
const SLUG = "demo";
const SCHEMA = "tenant_demo";
const EMAIL = "admin@demo.com";
const PASSWORD = "demo123456";
const NAME = "Loja Demo";

async function waitHealth(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend não respondeu em ${API}/health`);
}

async function main() {
  await waitHealth();

  const prisma = new PrismaClient();
  try {
    let tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
    if (!tenant) {
      const res = await fetch(`${API}/dev/provisionar-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: NAME, slug: SLUG }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          `provisionar-tenant: ${res.status} ${JSON.stringify(body)}`,
        );
      }
      tenant = body.tenant;
      console.log(`✅ Tenant provisionado: ${SLUG}`);
    } else {
      console.log(`✅ Tenant já existe: ${SLUG}`);
    }

    const hash = await bcrypt.hash(PASSWORD, 12);
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id FROM "${SCHEMA}".users WHERE email = $1 LIMIT 1`,
      EMAIL,
    );
    if (Array.isArray(rows) && rows.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${SCHEMA}".users
         SET password_hash = $1, name = $2, role = 'admin', is_active = true, updated_at = NOW()
         WHERE email = $3`,
        hash,
        "Admin Demo",
        EMAIL,
      );
      console.log(`✅ Usuário atualizado: ${EMAIL}`);
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${SCHEMA}".users
           (email, name, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, 'admin', true, NOW(), NOW())`,
        EMAIL,
        "Admin Demo",
        hash,
      );
      console.log(`✅ Usuário criado: ${EMAIL}`);
    }

    console.log("");
    console.log("Pronto. No SEU navegador:");
    console.log("  http://localhost:3001/demo/login");
    console.log(`  ${EMAIL} / ${PASSWORD}`);
    console.log("  Admin: http://localhost:3001/admin/login");
    console.log("  admin@sistema.com / admin123_TROQUE_EM_PRODUCAO");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
