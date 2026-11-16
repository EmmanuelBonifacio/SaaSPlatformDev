import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildClientMatchKey } from "./clients.match";
import { clientsService } from "./clients.service";

vi.mock("./clients.repository", () => ({
  listClients: vi.fn(),
  getClientById: vi.fn(),
  findClientByMatchKey: vi.fn(),
  upsertClient: vi.fn(),
}));

import {
  findClientByMatchKey,
  upsertClient,
} from "./clients.repository";

describe("clients match key", () => {
  it("usa documento quando há CNPJ/CPF", () => {
    expect(
      buildClientMatchKey({
        cnpjCpf: "12.345.678/0001-90",
        nomeFantasia: "Loja X",
      }),
    ).toBe("doc:12345678000190");
  });

  it("usa nome quando não há documento", () => {
    expect(
      buildClientMatchKey({
        cnpjCpf: null,
        nomeFantasia: "  Loja   Teste ",
      }),
    ).toBe("name:loja teste");
  });
});

describe("ClientsService.upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza cliente existente sem criar duplicata", async () => {
    const existing = {
      id: "11111111-1111-1111-1111-111111111111",
      matchKey: "doc:12345678000190",
      status: "lead" as const,
      nomeFantasia: "Loja Antiga",
      cnpjCpf: "12345678000190",
      tags: ["a"],
      origem: null,
      plano: null,
      mrr: 0,
      responsavel: null,
      whatsapp: null,
      email: null,
      produtoContratado: null,
      dorPrincipal: "Dor antiga",
      objetivoSaas: null,
      modulos: {},
      dashboardLink: null,
      externalId: null,
      notasRelatorio: "Primeiro relatório",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(findClientByMatchKey).mockResolvedValue(existing);
    vi.mocked(upsertClient).mockResolvedValue({
      client: { ...existing, nomeFantasia: "Loja Nova", status: "ativo" },
      created: false,
    });

    const result = await clientsService.upsert(
      "tenant_acme",
      { userId: "22222222-2222-2222-2222-222222222222" },
      {
        nomeFantasia: "Loja Nova",
        cnpjCpf: "12.345.678/0001-90",
        status: "ativo",
        tags: ["b"],
        mrr: 199,
        modulos: { agentes: true },
        relatorioNota: "Segundo relatório",
      },
    );

    expect(result.created).toBe(false);
    expect(upsertClient).toHaveBeenCalledOnce();
    const persist = vi.mocked(upsertClient).mock.calls[0][1];
    expect(persist.matchKey).toBe("doc:12345678000190");
    expect(persist.tags).toEqual(["a", "b"]);
    expect(persist.notasRelatorio).toContain("Primeiro relatório");
    expect(persist.notasRelatorio).toContain("Segundo relatório");
    expect(persist.dorPrincipal).toBe("Dor antiga");
  });
});
