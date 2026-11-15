import { describe, expect, it } from "vitest";
import {
  canReadMemory,
  canReviewMemory,
  containsLikelySecret,
} from "./memory.policy";
import {
  createMemoryCandidateSchema,
  listMemorySchema,
  searchMemorySchema,
} from "./memory.schema";

describe("memory access policy", () => {
  it("keeps personal entries private and exposes tenant entries within the tenant", () => {
    expect(canReadMemory("user", "user-a", "user-a")).toBe(true);
    expect(canReadMemory("user", "user-b", "user-a")).toBe(false);
    expect(canReadMemory("tenant", null, "user-a")).toBe(true);
  });

  it("allows personal review only by its owner and shared review only by admins", () => {
    expect(canReviewMemory("user", "user-a", "user-a", "user")).toBe(true);
    expect(canReviewMemory("user", "user-b", "user-a", "admin")).toBe(false);
    expect(canReviewMemory("tenant", null, "user-a", "admin")).toBe(true);
    expect(canReviewMemory("tenant", null, "user-a", "user")).toBe(false);
  });

  it("rejects content with common credential patterns", () => {
    expect(containsLikelySecret("api_key=example-secret-value")).toBe(true);
    expect(containsLikelySecret("A decisão aprovada foi usar PostgreSQL.")).toBe(false);
  });
});

describe("memory input schemas", () => {
  it("applies safe defaults and rejects overlong candidate content", () => {
    const parsed = createMemoryCandidateSchema.parse({
      title: "Preferência",
      content: "Responder em português.",
      category: "preference",
    });
    expect(parsed.scope).toBe("user");
    expect(
      createMemoryCandidateSchema.safeParse({
        title: "Contexto",
        content: "x".repeat(4_001),
        category: "context",
      }).success,
    ).toBe(false);
  });

  it("bounds search and listing pagination", () => {
    expect(searchMemorySchema.safeParse({ query: "aa", limit: 10 }).success).toBe(true);
    expect(searchMemorySchema.safeParse({ query: "x", limit: 100 }).success).toBe(false);
    expect(listMemorySchema.safeParse({ limit: 51, offset: 0 }).success).toBe(false);
    expect(listMemorySchema.safeParse({ limit: 20, offset: 0 }).success).toBe(true);
  });
});
