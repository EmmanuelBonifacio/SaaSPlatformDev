import { ClientsModuleError } from "./clients.errors";
import { buildClientMatchKey, normalizeDocument } from "./clients.match";
import {
  findClientByMatchKey,
  getClientById,
  listClients,
  upsertClient,
} from "./clients.repository";
import type { ListClientsDto, UpsertClientDto } from "./clients.schema";
import type { ClientActor, ClientModules, ClientRecord } from "./clients.types";

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mergeTags(existing: string[], incoming: string[]): string[] {
  const set = new Set<string>();
  for (const tag of [...existing, ...incoming]) {
    const normalized = tag.trim().toLowerCase();
    if (normalized) set.add(normalized);
  }
  return Array.from(set).slice(0, 20);
}

function mergeModules(
  existing: ClientModules,
  incoming: ClientModules,
): ClientModules {
  return {
    financeiro: incoming.financeiro ?? existing.financeiro ?? false,
    agentes: incoming.agentes ?? existing.agentes ?? false,
    comercial: incoming.comercial ?? existing.comercial ?? false,
  };
}

function appendReportNote(
  existing: string | null,
  incoming: string | null | undefined,
): string | null {
  const note = emptyToNull(incoming ?? null);
  if (!note) return existing;
  if (!existing) return note;
  if (existing.includes(note)) return existing;
  const stamp = new Date().toISOString().slice(0, 10);
  return `${existing.trim()}\n\n---\n[${stamp}]\n${note}`.slice(0, 20_000);
}

function preferText(
  incoming: string | null | undefined,
  existing: string | null,
): string | null {
  return emptyToNull(incoming ?? null) ?? existing;
}

export class ClientsService {
  async list(
    schemaName: string,
    actor: ClientActor,
    input: ListClientsDto,
  ): Promise<ClientRecord[]> {
    return listClients(schemaName, actor.userId, input);
  }

  async get(
    schemaName: string,
    actor: ClientActor,
    clientId: string,
  ): Promise<ClientRecord> {
    const client = await getClientById(schemaName, actor.userId, clientId);
    if (!client) {
      throw new ClientsModuleError(404, "Cliente não encontrado.");
    }
    return client;
  }

  /**
   * Cria ou atualiza pelo match_key (CNPJ/CPF ou nome).
   * Relatórios repetidos do mesmo cliente nunca geram duplicata.
   */
  async upsert(
    schemaName: string,
    actor: ClientActor,
    input: UpsertClientDto,
  ): Promise<{ client: ClientRecord; created: boolean }> {
    const matchKey = buildClientMatchKey({
      cnpjCpf: input.cnpjCpf,
      nomeFantasia: input.nomeFantasia,
    });
    const existing = await findClientByMatchKey(
      schemaName,
      actor.userId,
      matchKey,
    );

    const digits = normalizeDocument(input.cnpjCpf);
    const cnpjCpf =
      digits.length >= 11 ? digits : (existing?.cnpjCpf ?? null);

    const tags = mergeTags(existing?.tags ?? [], input.tags ?? []);
    const modulos = mergeModules(existing?.modulos ?? {}, input.modulos ?? {});
    const notasRelatorio = appendReportNote(
      existing?.notasRelatorio ?? null,
      input.relatorioNota,
    );

    return upsertClient(schemaName, {
      matchKey,
      status: input.status ?? existing?.status ?? "lead",
      nomeFantasia: input.nomeFantasia.trim(),
      cnpjCpf,
      tags,
      origem: input.origem ?? existing?.origem ?? null,
      plano: input.plano ?? existing?.plano ?? null,
      mrr: input.mrr ?? existing?.mrr ?? 0,
      responsavel: preferText(input.responsavel, existing?.responsavel ?? null),
      whatsapp: preferText(input.whatsapp, existing?.whatsapp ?? null),
      email: preferText(input.email, existing?.email ?? null),
      produtoContratado: preferText(
        input.produtoContratado,
        existing?.produtoContratado ?? null,
      ),
      dorPrincipal: preferText(
        input.dorPrincipal,
        existing?.dorPrincipal ?? null,
      ),
      objetivoSaas: preferText(
        input.objetivoSaas,
        existing?.objetivoSaas ?? null,
      ),
      modulos,
      dashboardLink: preferText(
        input.dashboardLink,
        existing?.dashboardLink ?? null,
      ),
      externalId: preferText(input.externalId, existing?.externalId ?? null),
      notasRelatorio,
      actorUserId: actor.userId,
    });
  }
}

export const clientsService = new ClientsService();
