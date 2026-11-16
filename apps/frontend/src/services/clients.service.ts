import api from "./api";
import type { ClientRecord, UpsertClientInput } from "@/types/clients.types";

export const clientsApiService = {
  async list(query = ""): Promise<ClientRecord[]> {
    const response = await api.get<ClientRecord[]>("/clients", {
      params: query ? { query, limit: 100 } : { limit: 100 },
    });
    return response.data;
  },

  async get(clientId: string): Promise<ClientRecord> {
    const response = await api.get<ClientRecord>(`/clients/${clientId}`);
    return response.data;
  },

  async upsert(
    input: UpsertClientInput,
  ): Promise<{ client: ClientRecord; created: boolean }> {
    const response = await api.post<{ client: ClientRecord; created: boolean }>(
      "/clients/upsert",
      input,
    );
    return response.data;
  },
};
