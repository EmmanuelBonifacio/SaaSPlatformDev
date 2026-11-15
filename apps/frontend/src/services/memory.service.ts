import api from "./api";
import type {
  MemoryCategory,
  MemoryEntry,
  MemoryScope,
  MemorySettings,
} from "@/types/memory.types";

export interface CreateMemoryCandidate {
  title: string;
  content: string;
  category: MemoryCategory;
  scope: MemoryScope;
}

export const memoryApiService = {
  async list(query = ""): Promise<MemoryEntry[]> {
    const response = await api.get<MemoryEntry[]>("/memory/entries", {
      params: query ? { query } : undefined,
    });
    return response.data;
  },

  async candidates(): Promise<MemoryEntry[]> {
    const response = await api.get<MemoryEntry[]>("/memory/candidates", {
      params: { limit: 50 },
    });
    return response.data;
  },

  async createCandidate(input: CreateMemoryCandidate): Promise<MemoryEntry> {
    const response = await api.post<MemoryEntry>("/memory/candidates", input);
    return response.data;
  },

  async review(
    memoryId: string,
    action: "approve" | "reject",
  ): Promise<void> {
    await api.post(`/memory/candidates/${memoryId}/review`, { action });
  },

  async remove(memoryId: string): Promise<void> {
    await api.delete(`/memory/entries/${memoryId}`);
  },

  async getSettings(): Promise<MemorySettings> {
    const response = await api.get<MemorySettings>("/memory/settings");
    return response.data;
  },

  async updateSettings(
    captureSuggestions: boolean,
  ): Promise<MemorySettings> {
    const response = await api.patch<MemorySettings>("/memory/settings", {
      captureSuggestions,
    });
    return response.data;
  },
};
