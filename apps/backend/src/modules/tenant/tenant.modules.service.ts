// =============================================================================
// src/modules/tenant/tenant.modules.service.ts
// =============================================================================
// Serviço de módulos por tenant — retorna módulos com flags de feature.
// IMPORTANTE: usa Prisma.sql para fragmentos SQL (não strings puras),
// porque $queryRaw parametriza strings JS como $N — quebrando SELECT columns.
// =============================================================================

import { Prisma } from "@prisma/client";
import { prisma } from "../../core/database/prisma";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ModuleRow {
  id: string;
  moduleId: string;
  name: string;
  displayName: string;
  description: string | null;
  icone: string | null;
  isEnabled: boolean;
  visivel: boolean;
  emBreve: boolean;
  beta: boolean;
  trialAte: Date | null;
  bloqueadoMotivo: string | null;
  trialRestanteDias: number | null;
  trialExpirado: boolean;
}

export interface TenantModuleInfo {
  id: string;
  moduleId: string;
  name: string;
  displayName: string;
  description: string | null;
  icone: string | null;
  ativo: boolean;
  visivel: boolean;
  emBreve: boolean;
  beta: boolean;
  trialRestanteDias: number | null;
  trialExpirado: boolean;
  bloqueadoMotivo: string | null;
}

export interface TenantPlanoInfo {
  nome: string;
  expiraEm: string | null;
  emTrial: boolean;
}

// ─── SQL fragment — Prisma.sql para inline seguro ────────────────────────────
// Prisma.sql cria um fragmento SQL que é INLINADO (não parametrizado) quando
// interpolado em outro Prisma.sql ou $queryRaw. Strings JS comuns seriam
// tratadas como parâmetros ($1, $2...), quebrando a lista de colunas SELECT.

const SELECT_FIELDS = Prisma.sql`
  tm.id,
  tm.module_id        AS "moduleId",
  m.name,
  m.display_name      AS "displayName",
  m.description,
  m.icone,
  tm.is_enabled       AS "isEnabled",
  tm.visivel,
  tm.em_breve         AS "emBreve",
  tm.beta,
  tm.trial_ate        AS "trialAte",
  tm.bloqueado_motivo AS "bloqueadoMotivo",
  CASE
    WHEN tm.trial_ate IS NOT NULL AND tm.trial_ate > NOW()
    THEN EXTRACT(DAY FROM (tm.trial_ate - NOW()))::INTEGER
    ELSE NULL
  END AS "trialRestanteDias",
  CASE
    WHEN tm.trial_ate IS NOT NULL AND tm.trial_ate < NOW()
    THEN true
    ELSE false
  END AS "trialExpirado"
`;

function mapRow(row: ModuleRow): TenantModuleInfo {
  return {
    id: row.id,
    moduleId: row.moduleId,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    icone: row.icone,
    ativo: row.isEnabled,
    visivel: row.visivel,
    emBreve: row.emBreve,
    beta: row.beta,
    trialRestanteDias: row.trialRestanteDias !== null ? Number(row.trialRestanteDias) : null,
    trialExpirado: Boolean(row.trialExpirado),
    bloqueadoMotivo: row.bloqueadoMotivo,
  };
}

// ─── Público (para o tenant logado) ──────────────────────────────────────────

/** Retorna apenas módulos com visivel=true e is_enabled=true. */
export async function getTenantVisibleModules(tenantId: string): Promise<TenantModuleInfo[]> {
  const rows = await prisma.$queryRaw<ModuleRow[]>(Prisma.sql`
    SELECT ${SELECT_FIELDS}
    FROM tenant_modules tm
    JOIN modules m ON m.id = tm.module_id
    WHERE tm.tenant_id = ${tenantId}
      AND tm.visivel    = true
      AND tm.is_enabled = true
    ORDER BY m.display_name
  `);
  return rows.map(mapRow);
}

/** Retorna info do plano do tenant. */
export async function getTenantPlano(tenantId: string): Promise<TenantPlanoInfo | null> {
  const rows = await prisma.$queryRaw<
    Array<{ nome: string | null; planoAte: Date | null; emTrial: boolean }>
  >(Prisma.sql`
    SELECT p.nome, t.plano_ate AS "planoAte", t.em_trial AS "emTrial"
    FROM tenants t
    LEFT JOIN planos p ON p.id = t.plano_id
    WHERE t.id = ${tenantId}
  `);

  const row = rows[0];
  if (!row?.nome) return null;

  return {
    nome: row.nome,
    expiraEm: row.planoAte ? row.planoAte.toISOString() : null,
    emTrial: Boolean(row.emTrial),
  };
}

// ─── Admin (sem filtro de visibilidade) ──────────────────────────────────────

/** Retorna TODOS os módulos do tenant (incluindo invisíveis). Uso: painel admin. */
export async function getAllTenantModules(tenantId: string): Promise<TenantModuleInfo[]> {
  const rows = await prisma.$queryRaw<ModuleRow[]>(Prisma.sql`
    SELECT ${SELECT_FIELDS}
    FROM tenant_modules tm
    JOIN modules m ON m.id = tm.module_id
    WHERE tm.tenant_id = ${tenantId}
    ORDER BY m.display_name
  `);
  return rows.map(mapRow);
}

/** Atualiza flags por tenant-módulo (admin). */
export async function updateTenantModuleFlags(
  tenantId: string,
  moduleName: string,
  flags: {
    visivel?: boolean;
    emBreve?: boolean;
    beta?: boolean;
    isEnabled?: boolean;
    bloqueadoMotivo?: string | null;
  },
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE tenant_modules tm
    SET
      visivel          = COALESCE(${flags.visivel          ?? null}, tm.visivel),
      em_breve         = COALESCE(${flags.emBreve          ?? null}, tm.em_breve),
      beta             = COALESCE(${flags.beta             ?? null}, tm.beta),
      is_enabled       = COALESCE(${flags.isEnabled        ?? null}, tm.is_enabled),
      bloqueado_motivo = COALESCE(${flags.bloqueadoMotivo  ?? null}, tm.bloqueado_motivo)
    FROM modules m
    WHERE tm.module_id  = m.id
      AND tm.tenant_id  = ${tenantId}
      AND m.name        = ${moduleName}
  `;
}

/** Ativa trial de N dias para o módulo do tenant (admin). */
export async function activateTenantModuleTrial(
  tenantId: string,
  moduleName: string,
  dias: number,
): Promise<Date> {
  const trialAte = new Date(Date.now() + dias * 86_400_000);

  await prisma.$executeRaw`
    UPDATE tenant_modules tm
    SET
      trial_ate  = NOW() + make_interval(days => ${dias}),
      visivel    = true,
      is_enabled = true
    FROM modules m
    WHERE tm.module_id = m.id
      AND tm.tenant_id = ${tenantId}
      AND m.name       = ${moduleName}
  `;

  return trialAte;
}
