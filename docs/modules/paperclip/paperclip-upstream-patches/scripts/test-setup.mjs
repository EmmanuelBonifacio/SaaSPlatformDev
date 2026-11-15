#!/usr/bin/env node
/**
 * test:setup — reseta o Postgres embutido / banco de teste do Paperclip.
 *
 * Copiar para a raiz do fork: EmmanuelBonifacio/paperclip → scripts/test-setup.mjs
 * e registrar em package.json: "test:setup": "node scripts/test-setup.mjs"
 *
 * NÃO edita migrations. NÃO altera hashes no journal.
 *
 * Uso:
 *   pnpm test:setup
 *   PAPERCLIP_TEST_DATABASE_URL=postgres://... pnpm test:setup
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "packages/db/src/migrations");

function fail(message) {
  console.error(`[test:setup] ${message}`);
  process.exit(1);
}

async function assertMigrationsAreLf() {
  if (!existsSync(migrationsDir)) {
    fail(`migrations não encontradas em ${migrationsDir}`);
  }
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql"));
  const crlfFiles = [];
  for (const name of files) {
    const bytes = await readFile(join(migrationsDir, name));
    if (bytes.includes(Buffer.from("\r\n"))) crlfFiles.push(name);
  }
  if (crlfFiles.length) {
    fail(
      `Migrations com CRLF detectadas (hashes divergem do journal). ` +
        `Normalize para LF sem editar o SQL:\n  ${crlfFiles.slice(0, 20).join("\n  ")}` +
        (crlfFiles.length > 20 ? `\n  … (+${crlfFiles.length - 20})` : ""),
    );
  }
  const sample = ["0466_drop_project_environment.sql", "0467_fair_human_torch.sql"];
  for (const name of sample) {
    const path = join(migrationsDir, name);
    if (!existsSync(path)) continue;
    const content = await readFile(path);
    const hash = createHash("sha256").update(content).digest("hex");
    console.log(`[test:setup] ${name} sha256=${hash}`);
  }
}

async function resetViaDbPackage() {
  const clientModuleUrl = pathToFileURL(
    join(root, "packages/db/src/client.ts"),
  ).href;
  const embeddedModuleUrl = pathToFileURL(
    join(root, "packages/db/src/test-embedded-postgres.ts"),
  ).href;

  const url =
    process.env.PAPERCLIP_TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    null;

  if (url) {
    const { resetPostgresDatabase, ensurePostgresDatabase, applyPendingMigrations } =
      await import(clientModuleUrl);
    const databaseName = new URL(url).pathname.replace(/^\//, "");
    if (!databaseName) fail("URL de banco sem nome de database");
    if (!/_test$/.test(databaseName) && process.env.PAPERCLIP_TEST_SETUP_ALLOW_NON_TEST !== "1") {
      fail(
        `Recusando reset de database "${databaseName}". ` +
          `Use um database *_test ou defina PAPERCLIP_TEST_SETUP_ALLOW_NON_TEST=1 com cuidado.`,
      );
    }
    console.log(`[test:setup] resetando database ${databaseName}`);
    await resetPostgresDatabase(url, databaseName);
    await ensurePostgresDatabase(url);
    await applyPendingMigrations(url);
    console.log("[test:setup] migrations aplicadas");
    return;
  }

  console.log("[test:setup] sem DATABASE_URL — iniciando embedded postgres de teste e migrando");
  const { startEmbeddedPostgresTestDatabase } = await import(embeddedModuleUrl);
  const { applyPendingMigrations } = await import(clientModuleUrl);
  const db = await startEmbeddedPostgresTestDatabase("paperclip-test-setup-");
  try {
    await applyPendingMigrations(db.connectionString);
    console.log(`[test:setup] embedded ok: ${db.connectionString.replace(/:[^:@/]+@/, ":***@")}`);
  } finally {
    await db.cleanup();
  }
}

await assertMigrationsAreLf();
await resetViaDbPackage();
console.log("[test:setup] concluído");
