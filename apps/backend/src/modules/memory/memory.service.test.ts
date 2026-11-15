import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryService } from "./memory.service";

const repositoryMocks = vi.hoisted(() => ({
  listMemories: vi.fn(),
}));

vi.mock("./memory.repository", () => ({
  createCandidate: vi.fn(),
  getCaptureSetting: vi.fn(),
  listCandidates: vi.fn(),
  listMemories: repositoryMocks.listMemories,
  updateCaptureSetting: vi.fn(),
}));

vi.mock("./memory.repository.actions", () => ({
  cleanupExpiredCandidates: vi.fn(),
  deleteMemory: vi.fn(),
  reviewCandidate: vi.fn(),
}));

describe("MemoryService.searchForAgent", () => {
  beforeEach(() => {
    repositoryMocks.listMemories.mockReset();
  });

  it("keeps the complete context, including its notice, within 4,000 characters", async () => {
    repositoryMocks.listMemories.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000001",
        scope: "user",
        category: "context",
        title: "Context",
        content: "x".repeat(5_000),
        status: "approved",
        sourceType: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      },
    ]);

    const context = await memoryService.searchForAgent(
      "tenant_example",
      "00000000-0000-4000-8000-000000000002",
      "project context",
    );

    expect(context.length).toBeLessThanOrEqual(4_000);
    expect(context).toContain("referência não confiável");
  });

  it("returns an empty context when there are no approved matches", async () => {
    repositoryMocks.listMemories.mockResolvedValue([]);

    await expect(
      memoryService.searchForAgent(
        "tenant_example",
        "00000000-0000-4000-8000-000000000002",
        "project context",
      ),
    ).resolves.toBe("");
  });
});
