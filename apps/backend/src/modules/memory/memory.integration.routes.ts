import { expect } from "vitest";
import {
  MEMORY_TEST_TENANTS,
  MEMORY_TEST_USERS,
} from "./memory.integration.database";
import { buildMemoryIntegrationServer } from "./memory.integration.server";

export async function runMemoryRouteIntegrationChecks(): Promise<void> {
  const app = await buildMemoryIntegrationServer();
  const tenantId = MEMORY_TEST_TENANTS[0].id;
  const ownerToken = app.jwt.sign({
    sub: MEMORY_TEST_USERS.owner,
    tenantId,
    role: "user",
  });
  const ownerHeaders = {
    authorization: `Bearer ${ownerToken}`,
    "x-tenant-id": tenantId,
  };

  try {
    expect(
      (await app.inject({ method: "GET", url: "/memory/entries" })).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/memory/entries",
          headers: { authorization: `Bearer ${ownerToken}` },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/memory/entries",
          headers: { ...ownerHeaders, "x-tenant-id": MEMORY_TEST_TENANTS[1].id },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/memory/entries?limit=51",
          headers: ownerHeaders,
        })
      ).statusCode,
    ).toBe(400);

    const created = await app.inject({
      method: "POST",
      url: "/memory/candidates",
      headers: ownerHeaders,
      payload: {
        title: "Rascunho privado",
        content: "Visivel somente para quem criou.",
        category: "fact",
        scope: "user",
      },
    });
    expect(created.statusCode).toBe(201);
    const memoryId = created.json<{ id: string }>().id;
    const otherHeaders = {
      authorization: `Bearer ${app.jwt.sign({
        sub: MEMORY_TEST_USERS.other,
        tenantId,
        role: "user",
      })}`,
      "x-tenant-id": tenantId,
    };

    const review = await app.inject({
      method: "POST",
      url: `/memory/candidates/${memoryId}/review`,
      headers: otherHeaders,
      payload: { action: "approve" },
    });
    expect(review.statusCode).toBe(404);
    const candidates = await app.inject({
      method: "GET",
      url: "/memory/candidates",
      headers: otherHeaders,
    });
    expect(
      candidates.json<Array<{ id: string }>>().map((candidate) => candidate.id),
    ).not.toContain(memoryId);
  } finally {
    await app.close();
  }
}
