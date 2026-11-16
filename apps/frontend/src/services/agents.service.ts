import api from "./api";
import type {
  AgentsActivity,
  AgentsAgent,
  AgentsApproval,
  AgentsComment,
  AgentsRun,
  AgentsTask,
  CreateAgentInput,
  UpdateAgentInput,
  UpdateTaskInput,
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

  async getAgent(agentId: string): Promise<AgentsAgent> {
    const response = await api.get<AgentsAgent>(
      `/agents/${encodeURIComponent(agentId)}`,
    );
    return response.data;
  },

  async createAgent(input: CreateAgentInput): Promise<AgentsAgent> {
    const response = await api.post<AgentsAgent>("/agents", input);
    return response.data;
  },

  async updateAgent(
    agentId: string,
    input: UpdateAgentInput,
  ): Promise<AgentsAgent> {
    const response = await api.patch<AgentsAgent>(
      `/agents/${encodeURIComponent(agentId)}`,
      input,
    );
    return response.data;
  },

  async listTasks(): Promise<AgentsTask[]> {
    const response = await api.get<AgentsTask[]>("/agents/tasks");
    return response.data;
  },

  async getTask(taskId: string): Promise<AgentsTask> {
    const response = await api.get<AgentsTask>(
      `/agents/tasks/${encodeURIComponent(taskId)}`,
    );
    return response.data;
  },

  async createTask(input: {
    title: string;
    description?: string | null;
    assigneeAgentId?: string | null;
    visibility?: "open" | "private";
    status?: AgentsTask["status"];
    priority?: AgentsTask["priority"];
  }): Promise<AgentsTask> {
    const response = await api.post<AgentsTask>("/agents/tasks", input);
    return response.data;
  },

  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<AgentsTask> {
    const response = await api.patch<AgentsTask>(
      `/agents/tasks/${encodeURIComponent(taskId)}`,
      input,
    );
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

  async listApprovals(params?: {
    status?: AgentsApproval["status"];
    limit?: number;
    offset?: number;
  }): Promise<AgentsApproval[]> {
    const response = await api.get<AgentsApproval[]>("/agents/approvals", {
      params,
    });
    return response.data;
  },

  async decideApproval(
    approvalId: string,
    input: { decision: "approved" | "rejected"; decisionNote?: string | null },
  ): Promise<AgentsApproval> {
    const response = await api.post<AgentsApproval>(
      `/agents/approvals/${encodeURIComponent(approvalId)}/decide`,
      input,
    );
    return response.data;
  },

  async listRuns(params?: {
    agentId?: string;
    taskId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgentsRun[]> {
    const response = await api.get<AgentsRun[]>("/agents/runs", { params });
    return response.data;
  },

  async getRun(runId: string): Promise<AgentsRun> {
    const response = await api.get<AgentsRun>(
      `/agents/runs/${encodeURIComponent(runId)}`,
    );
    return response.data;
  },

  async listActivity(params?: {
    agentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgentsActivity[]> {
    const response = await api.get<AgentsActivity[]>("/agents/activity", {
      params,
    });
    return response.data;
  },
};
