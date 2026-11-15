export type MemoryCategory =
  | "preference"
  | "fact"
  | "decision"
  | "procedure"
  | "context";

export type MemoryScope = "user" | "tenant";
export type MemoryStatus = "draft" | "approved";

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  category: MemoryCategory;
  title: string;
  content: string;
  status: MemoryStatus;
  sourceType: "manual" | "conversation";
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface MemorySettings {
  captureSuggestions: boolean;
}
