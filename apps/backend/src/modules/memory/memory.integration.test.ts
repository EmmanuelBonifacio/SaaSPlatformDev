import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  initializeMemoryTestDatabase,
  MEMORY_TEST_TENANTS,
  MEMORY_TEST_USERS,
} from "./memory.integration.database";

const describeDatabase = process.env.MEMORY_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeDatabase("tenant memory database isolation", () => {
  let memoryService: typeof import("./memory.service").memoryService;
  let closeDatabase: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    ({ memoryService, close: closeDatabase } =
      await initializeMemoryTestDatabase());
  });
  afterAll(async () => {
    await closeDatabase?.();
  });
  it("isolates personal/shared memories and enforces active database roles", async () => {
    const personalDraft = await memoryService.createManualCandidate(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.owner },
      {
        title: "Preferência pessoal de teste",
        content: "Resposta objetiva, sem compartilhar com outro usuário.",
        category: "preference",
        scope: "user",
      },
    );
    await memoryService.review(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.owner },
      personalDraft.id,
      "approve",
    );

    const privateForOwner = await memoryService.list(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.owner },
      { limit: 20, offset: 0 },
    );
    const privateForOther = await memoryService.list(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.other },
      { limit: 20, offset: 0 },
    );
    expect(privateForOwner.map((entry) => entry.id)).toContain(personalDraft.id);
    expect(privateForOther.map((entry) => entry.id)).not.toContain(personalDraft.id);
    const sharedDraft = await memoryService.createManualCandidate(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.admin },
      {
        title: "Procedimento compartilhado de teste",
        content: "Este procedimento pertence somente ao tenant de teste A.",
        category: "procedure",
        scope: "tenant",
      },
    );
    await expect(
      memoryService.review(
        MEMORY_TEST_TENANTS[0].schema,
        { userId: MEMORY_TEST_USERS.other },
        sharedDraft.id,
        "approve",
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    await memoryService.review(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.admin },
      sharedDraft.id,
      "approve",
    );

    const sharedForOtherUser = await memoryService.list(
      MEMORY_TEST_TENANTS[0].schema,
      { userId: MEMORY_TEST_USERS.other },
      { limit: 20, offset: 0 },
    );
    const sharedForOtherTenant = await memoryService.list(
      MEMORY_TEST_TENANTS[1].schema,
      { userId: MEMORY_TEST_USERS.other },
      { limit: 20, offset: 0 },
    );
    expect(sharedForOtherUser.map((entry) => entry.id)).toContain(sharedDraft.id);
    expect(sharedForOtherTenant.map((entry) => entry.id)).not.toContain(sharedDraft.id);
    await expect(
      memoryService.createManualCandidate(
        MEMORY_TEST_TENANTS[0].schema,
        { userId: MEMORY_TEST_USERS.other },
        {
          title: "Sugestão não autorizada",
          content: "Usuário regular não pode sugerir memória compartilhada.",
          category: "procedure",
          scope: "tenant",
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      memoryService.list(
        MEMORY_TEST_TENANTS[0].schema,
        { userId: MEMORY_TEST_USERS.inactive },
        { limit: 20, offset: 0 },
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("honors opt-in capture and keeps conversation suggestions out of approved search", async () => {
    const actor = { userId: MEMORY_TEST_USERS.owner };
    const suggestion = {
      title: "Preferência capturada no teste",
      content: "O usuário prefere respostas curtas.",
      category: "preference" as const,
    };
    await expect(
      memoryService.suggestFromConversation(MEMORY_TEST_TENANTS[0].schema, actor, suggestion),
    ).resolves.toEqual({ created: false });
    await memoryService.setSettings(
      MEMORY_TEST_TENANTS[0].schema,
      MEMORY_TEST_USERS.owner,
      true,
    );
    const result = await memoryService.suggestFromConversation(
      MEMORY_TEST_TENANTS[0].schema,
      actor,
      suggestion,
    );
    expect(result.created).toBe(true);

    const approvedSearch = await memoryService.searchForAgent(
      MEMORY_TEST_TENANTS[0].schema,
      MEMORY_TEST_USERS.owner,
      "preferência capturada",
    );
    expect(approvedSearch).not.toContain(suggestion.content);

    const candidates = await memoryService.candidates(
      MEMORY_TEST_TENANTS[0].schema,
      actor,
      20,
    );
    expect(candidates.map((candidate) => candidate.title)).toContain(
      suggestion.title,
    );
  });
});
