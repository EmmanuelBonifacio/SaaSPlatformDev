// =============================================================================
// src/core/tenant/tenant.provisioner.ts
// =============================================================================
// Provisiona schema isolado para novos tenants.
// Tabelas: auth (users/refresh_tokens) + FinIA + Paperclip + Memory.
// Módulos históricos (estoque/TV/frota/vendas/driver) NÃO são criados em
// tenants novos. Schemas antigos em produção permanecem intactos.
// =============================================================================

import { prisma } from "../database/prisma";
import { buildPaperclipTenantSchemaSQL } from "./paperclip-tenant-schema";
import { buildMemoryTenantSchemaSQL } from "./memory-tenant-schema";

function buildFiniaTenantSchemaSQL(schemaName: string): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS "${schemaName}".finia_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(20) DEFAULT '#3b82f6',
      type VARCHAR(20) DEFAULT 'expense'
    )`,
    `CREATE TABLE IF NOT EXISTS "${schemaName}".finia_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(100),
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description TEXT NOT NULL,
      category_name VARCHAR(100) DEFAULT 'Outros',
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      source VARCHAR(20) DEFAULT 'web',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schemaName}".finia_bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(100),
      name VARCHAR(150) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      due_day INT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      category_name VARCHAR(100) DEFAULT 'Moradia',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schemaName}".finia_debts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(100),
      name VARCHAR(150) NOT NULL,
      installment_amount DECIMAL(12,2) NOT NULL,
      total_installments INT NOT NULL,
      current_installment INT DEFAULT 1,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `INSERT INTO "${schemaName}".finia_categories (name, color, type)
     VALUES
       ('Alimentação', '#ef4444', 'expense'),
       ('Transporte', '#f59e0b', 'expense'),
       ('Moradia', '#3b82f6', 'expense'),
       ('Saúde', '#10b981', 'expense'),
       ('Lazer', '#ec4899', 'expense'),
       ('Educação', '#8b5cf6', 'expense'),
       ('Outros', '#6b7280', 'expense')
     ON CONFLICT (name) DO NOTHING`,
  ];
}

function buildTenantSchemaSQL(schemaName: string): string[] {
  return [
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,

    `CREATE TABLE IF NOT EXISTS "${schemaName}".users (
      id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name          VARCHAR(100),
      role          VARCHAR(50)  NOT NULL DEFAULT 'user',
      is_active     BOOLEAN      NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT users_email_unique UNIQUE (email)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_email
      ON "${schemaName}".users (email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_active
      ON "${schemaName}".users (is_active)
      WHERE is_active = true`,

    `CREATE TABLE IF NOT EXISTS "${schemaName}".refresh_tokens (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID         NOT NULL,
      token_hash  VARCHAR(64)  NOT NULL,
      expires_at  TIMESTAMPTZ  NOT NULL,
      is_revoked  BOOLEAN      NOT NULL DEFAULT false,
      ip_address  VARCHAR(45),
      user_agent  TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash),
      CONSTRAINT refresh_tokens_user_fk
        FOREIGN KEY (user_id) REFERENCES "${schemaName}".users(id)
        ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
      ON "${schemaName}".refresh_tokens (token_hash)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
      ON "${schemaName}".refresh_tokens (user_id)`,

    ...buildFiniaTenantSchemaSQL(schemaName),
    ...buildPaperclipTenantSchemaSQL(schemaName),
    ...buildMemoryTenantSchemaSQL(schemaName),
  ];
}

export type ProvisionTenantInput = {
  name: string;
  slug: string;
  schemaName: string;
  moduleNames?: string[];
};

export type ProvisionedTenant = {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
};

export async function provisionNewTenant(
  input: ProvisionTenantInput,
): Promise<ProvisionedTenant> {
  const { name, slug, schemaName, moduleNames } = input;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new Error(`Tenant com slug "${slug}" já existe.`);
  }

  const schemaSQLStatements = buildTenantSchemaSQL(schemaName);
  for (const sql of schemaSQLStatements) {
    await prisma.$executeRawUnsafe(sql);
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: { name, slug, schemaName },
    });

    const moduleFilter =
      moduleNames && moduleNames.length > 0
        ? { name: { in: moduleNames } }
        : { name: { notIn: ["paperclip"] } };

    const modules = await tx.module.findMany({
      where: moduleFilter,
      select: { id: true, name: true },
    });

    if (modules.length === 0 && moduleNames && moduleNames.length > 0) {
      throw new Error(
        `Nenhum dos módulos solicitados foi encontrado: ${moduleNames.join(", ")}`,
      );
    }

    await tx.tenantModule.createMany({
      data: modules.map((m) => ({
        tenantId: newTenant.id,
        moduleId: m.id,
        isEnabled: true,
      })),
      skipDuplicates: true,
    });

    return newTenant;
  });

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    schemaName: tenant.schemaName,
  };
}
