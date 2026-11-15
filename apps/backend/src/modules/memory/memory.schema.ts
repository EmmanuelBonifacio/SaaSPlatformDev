import { z } from "zod";
import { MEMORY_CATEGORIES } from "./memory.types";

export const memoryScopeSchema = z.enum(["user", "tenant"]);
export const authenticatedUserIdSchema = z.string().uuid();

export const createMemoryCandidateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(3).max(4_000),
  category: z.enum(MEMORY_CATEGORIES),
  scope: memoryScopeSchema.default("user"),
});

export const listMemorySchema = z.object({
  query: z.string().trim().min(2).max(160).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(5_000).default(0),
});

export const searchMemorySchema = z.object({
  query: z.string().trim().min(2).max(160),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export const listCandidatesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const memoryIdParamsSchema = z.object({
  memoryId: z.string().uuid(),
});

export const reviewMemorySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export const updateMemorySettingsSchema = z.object({
  captureSuggestions: z.boolean(),
});

export type CreateMemoryCandidateDto = z.infer<
  typeof createMemoryCandidateSchema
>;
export type ListMemoryDto = z.infer<typeof listMemorySchema>;
export type SearchMemoryDto = z.infer<typeof searchMemorySchema>;
export type ReviewMemoryDto = z.infer<typeof reviewMemorySchema>;
