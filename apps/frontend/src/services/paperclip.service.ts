/**
 * @deprecated SP-7 fase 5 — use `agentsApiService` (`/agents`).
 * A ponte HTTP `/paperclip` foi desligada no backend.
 */
export const paperclipApiService = {
  async listAgents(): Promise<never> {
    throw new Error(
      "A ponte /paperclip foi desligada. Use agentsApiService (/agents).",
    );
  },
  async listTasks(): Promise<never> {
    throw new Error(
      "A ponte /paperclip foi desligada. Use agentsApiService (/agents).",
    );
  },
  async listConversations(): Promise<never> {
    throw new Error(
      "Conversas Paperclip foram substituídas por tarefas/comentários nativos.",
    );
  },
  async createConversation(): Promise<never> {
    throw new Error(
      "Conversas Paperclip foram substituídas por tarefas/comentários nativos.",
    );
  },
  async getMessages(): Promise<never> {
    throw new Error(
      "Use agentsApiService.listComments(taskId) no runtime nativo.",
    );
  },
  async sendMessage(): Promise<never> {
    throw new Error(
      "Use agentsApiService.createComment(taskId, …) no runtime nativo.",
    );
  },
};
