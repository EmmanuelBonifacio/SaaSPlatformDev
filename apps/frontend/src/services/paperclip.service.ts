import api from "./api";
import type {
  PaperclipAgent,
  PaperclipConversation,
  PaperclipMessage,
  PaperclipTask,
} from "@/types/paperclip.types";

export const paperclipApiService = {
  async listAgents(): Promise<PaperclipAgent[]> {
    const response = await api.get<PaperclipAgent[]>("/paperclip/agents");
    return response.data;
  },

  async listTasks(): Promise<PaperclipTask[]> {
    const response = await api.get<PaperclipTask[]>("/paperclip/tasks");
    return response.data;
  },

  async listConversations(): Promise<PaperclipConversation[]> {
    const response = await api.get<PaperclipConversation[]>(
      "/paperclip/conversations",
    );
    return response.data;
  },

  async createConversation(input: {
    agentId: string;
    clientRequestId: string;
    message: string;
  }): Promise<PaperclipConversation> {
    const response = await api.post<PaperclipConversation>(
      "/paperclip/conversations",
      input,
    );
    return response.data;
  },

  async getMessages(conversationId: string): Promise<PaperclipMessage[]> {
    const response = await api.get<PaperclipMessage[]>(
      `/paperclip/conversations/${encodeURIComponent(conversationId)}/messages`,
    );
    return response.data;
  },

  async sendMessage(
    conversationId: string,
    input: { clientRequestId: string; message: string },
  ): Promise<PaperclipMessage> {
    const response = await api.post<PaperclipMessage>(
      `/paperclip/conversations/${encodeURIComponent(conversationId)}/messages`,
      input,
    );
    return response.data;
  },
};
