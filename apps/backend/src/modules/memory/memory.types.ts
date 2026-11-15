export const MEMORY_CATEGORIES = [
  "preference",
  "fact",
  "decision",
  "procedure",
  "context",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export type MemoryScope = "user" | "tenant";
export type MemoryStatus = "draft" | "approved";
export type MemorySource = "manual" | "conversation";

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  category: MemoryCategory;
  title: string;
  content: string;
  status: MemoryStatus;
  sourceType: MemorySource;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface MemoryActor {
  userId: string;
}
