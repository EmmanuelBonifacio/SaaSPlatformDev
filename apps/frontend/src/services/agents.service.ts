import api from "./api";
import type {
  AgentsAgent,
  AgentsComment,
  AgentsRun,
  AgentsTask,
} from "@/types/agents.types";

/**
 * Cliente tipado do frontend para a API nativa /agents (JWT SaaS via api.ts).
 * Não chama Paperclip externo.
 */
export const agentsApiService = {
  async listAgents(): Promise<AgentsAgent[]> {
    const response = await api.get<AgentsAgent[]>("/agents");
    return response.data;
  },

  async listTasks(): Promise<AgentsTask[]> {
    const response = await api.get<AgentsTask[]>("/agents/tasks");
    return response.data;
  },

  async createTask(input: {
    title: string;
    description?: string | null;
    assigneeAgentId?: string | null;
    visibility?: "open" | "private";
  }): Promise<AgentsTask> {
    const response = await api.post<AgentsTask>("/agents/tasks", input);
    return response.data;
  },

  async listComments(taskId: string): Promise<AgentsComment[]> {
    const response = await api.get<AgentsComment[]>(
      `/agents/tasks/${encodeURIComponent(taskId)}/comments`,
    );
    return response.data;
  },

  async createComment(
    taskId: string,
    input: { body: string; clientRequestId?: string },
  ): Promise<AgentsComment> {
    const response = await api.post<AgentsComment>(
      `/agents/tasks/${encodeURIComponent(taskId)}/comments`,
      input,
    );
    return response.data;
  },

  async createRun(
    agentId: string,
    input: { taskId?: string | null } = {},
  ): Promise<{ run: AgentsRun; approval: unknown }> {
    const response = await api.post<{ run: AgentsRun; approval: unknown }>(
      `/agents/${encodeURIComponent(agentId)}/runs`,
      input,
    );
    return response.data;
  },
};
