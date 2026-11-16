import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import { ClientsModuleError } from "./clients.errors";
import type {
  ClientModules,
  ClientOrigem,
  ClientPlano,
  ClientRecord,
  ClientStatus,
} from "./clients.types";

type ClientRow = {
  id: string;
  matchKey: string;
  status: ClientStatus;
  nomeFantasia: string;
  cnpjCpf: string | null;
  tags: unknown;
  origem: ClientOrigem | null;
  plano: ClientPlano | null;
  mrr: string | number;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  produtoContratado: string | null;
  dorPrincipal: string | null;
  objetivoSaas: string | null;
  modulos: unknown;
  dashboardLink: string | null;
  externalId: string | null;
  notasRelatorio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const CLIENT_COLUMNS = Prisma.sql`
  id,
  match_key AS "matchKey",
  status,
  nome_fantasia AS "nomeFantasia",
  cnpj_cpf AS "cnpjCpf",
  tags,
  origem,
  plano,
  mrr,
  responsavel,
  whatsapp,
  email,
  produto_contratado AS "produtoContratado",
  dor_principal AS "dorPrincipal",
  objetivo_saas AS "objetivoSaas",
  modulos,
  dashboard_link AS "dashboardLink",
  external_id AS "externalId",
  notas_relatorio AS "notasRelatorio",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asModules(value: unknown): ClientModules {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  return {
    financeiro: Boolean(raw.financeiro),
    agentes: Boolean(raw.agentes),
    comercial: Boolean(raw.comercial),
  };
}

function mapClient(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    matchKey: row.matchKey,
    status: row.status,
    nomeFantasia: row.nomeFantasia,
    cnpjCpf: row.cnpjCpf,
    tags: asStringArray(row.tags),
    origem: row.origem,
    plano: row.plano,
    mrr: Number(row.mrr) || 0,
    responsavel: row.responsavel,
    whatsapp: row.whatsapp,
    email: row.email,
    produtoContratado: row.produtoContratado,
    dorPrincipal: row.dorPrincipal,
    objetivoSaas: row.objetivoSaas,
    modulos: asModules(row.modulos),
    dashboardLink: row.dashboardLink,
    externalId: row.externalId,
    notasRelatorio: row.notasRelatorio,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertActiveUser(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id::text AS id
    FROM users
    WHERE id = ${userId}::uuid AND is_active = true
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new ClientsModuleError(401, "Usuário autenticado não está ativo.");
  }
}

export async function listClients(
  schemaName: string,
  userId: string,
  input: { query?: string; status?: ClientStatus; limit: number; offset: number },
): Promise<ClientRecord[]> {
  return withTenantSchema(schemaName, async (tx) => {
    await assertActiveUser(tx, userId);
    const query = input.query?.trim();
    const like = query ? `%${query}%` : null;
    const rows = await tx.$queryRaw<ClientRow[]>`
      SELECT ${CLIENT_COLUMNS}
      FROM crm_clients
      WHERE (${input.status == null} OR status = ${input.status ?? ""})
        AND (${like == null} OR nome_fantasia ILIKE ${like ?? ""}
          OR COALESCE(cnpj_cpf, '') ILIKE ${like ?? ""})
      ORDER BY updated_at DESC
      LIMIT ${input.limit} OFFSET ${input.offset}
    `;
    return rows.map(mapClient);
  });
}

export async function getClientById(
  schemaName: string,
  userId: string,
  clientId: string,
): Promise<ClientRecord | null> {
  return withTenantSchema(schemaName, async (tx) => {
    await assertActiveUser(tx, userId);
    const rows = await tx.$queryRaw<ClientRow[]>`
      SELECT ${CLIENT_COLUMNS}
      FROM crm_clients
      WHERE id = ${clientId}::uuid
      LIMIT 1
    `;
    return rows[0] ? mapClient(rows[0]) : null;
  });
}

export type UpsertClientPersist = {
  matchKey: string;
  status: ClientStatus;
  nomeFantasia: string;
  cnpjCpf: string | null;
  tags: string[];
  origem: ClientOrigem | null;
  plano: ClientPlano | null;
  mrr: number;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  produtoContratado: string | null;
  dorPrincipal: string | null;
  objetivoSaas: string | null;
  modulos: ClientModules;
  dashboardLink: string | null;
  externalId: string | null;
  notasRelatorio: string | null;
  actorUserId: string;
};

export async function upsertClient(
  schemaName: string,
  input: UpsertClientPersist,
): Promise<{ client: ClientRecord; created: boolean }> {
  return withTenantSchema(schemaName, async (tx) => {
    await assertActiveUser(tx, input.actorUserId);
    const tagsJson = JSON.stringify(input.tags);
    const modulosJson = JSON.stringify(input.modulos);

    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id FROM crm_clients
      WHERE match_key = ${input.matchKey}
      LIMIT 1
    `;
    const created = existing.length === 0;

    const rows = await tx.$queryRaw<ClientRow[]>`
      INSERT INTO crm_clients (
        match_key, status, nome_fantasia, cnpj_cpf, tags, origem, plano, mrr,
        responsavel, whatsapp, email, produto_contratado, dor_principal,
        objetivo_saas, modulos, dashboard_link, external_id, notas_relatorio,
        created_by, updated_by
      ) VALUES (
        ${input.matchKey}, ${input.status}, ${input.nomeFantasia}, ${input.cnpjCpf},
        ${tagsJson}::jsonb, ${input.origem}, ${input.plano}, ${input.mrr},
        ${input.responsavel}, ${input.whatsapp}, ${input.email},
        ${input.produtoContratado}, ${input.dorPrincipal}, ${input.objetivoSaas},
        ${modulosJson}::jsonb, ${input.dashboardLink}, ${input.externalId},
        ${input.notasRelatorio}, ${input.actorUserId}, ${input.actorUserId}
      )
      ON CONFLICT (match_key) DO UPDATE SET
        status = EXCLUDED.status,
        nome_fantasia = EXCLUDED.nome_fantasia,
        cnpj_cpf = COALESCE(EXCLUDED.cnpj_cpf, crm_clients.cnpj_cpf),
        tags = EXCLUDED.tags,
        origem = COALESCE(EXCLUDED.origem, crm_clients.origem),
        plano = COALESCE(EXCLUDED.plano, crm_clients.plano),
        mrr = EXCLUDED.mrr,
        responsavel = COALESCE(EXCLUDED.responsavel, crm_clients.responsavel),
        whatsapp = COALESCE(EXCLUDED.whatsapp, crm_clients.whatsapp),
        email = COALESCE(EXCLUDED.email, crm_clients.email),
        produto_contratado = COALESCE(EXCLUDED.produto_contratado, crm_clients.produto_contratado),
        dor_principal = COALESCE(EXCLUDED.dor_principal, crm_clients.dor_principal),
        objetivo_saas = COALESCE(EXCLUDED.objetivo_saas, crm_clients.objetivo_saas),
        modulos = EXCLUDED.modulos,
        dashboard_link = COALESCE(EXCLUDED.dashboard_link, crm_clients.dashboard_link),
        external_id = COALESCE(EXCLUDED.external_id, crm_clients.external_id),
        notas_relatorio = EXCLUDED.notas_relatorio,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING ${CLIENT_COLUMNS}
    `;

    if (!rows[0]) {
      throw new ClientsModuleError(500, "Não foi possível salvar o cliente.");
    }
    return { client: mapClient(rows[0]), created };
  });
}

export async function findClientByMatchKey(
  schemaName: string,
  userId: string,
  matchKey: string,
): Promise<ClientRecord | null> {
  return withTenantSchema(schemaName, async (tx) => {
    await assertActiveUser(tx, userId);
    const rows = await tx.$queryRaw<ClientRow[]>`
      SELECT ${CLIENT_COLUMNS}
      FROM crm_clients
      WHERE match_key = ${matchKey}
      LIMIT 1
    `;
    return rows[0] ? mapClient(rows[0]) : null;
  });
}
