import api from "./api";
import type {
  AgentsActivity,
  AgentsAgent,
  AgentsApproval,
  AgentsBudget,
  AgentsComment,
  AgentsCommentAttachment,
  AgentsLiveDashboard,
  AgentsRun,
  AgentsSecretRef,
  AgentsTask,
  AgentsTool,
  CreateAgentInput,
  UpdateAgentInput,
  UpdateTaskInput,
} from "@/types/agents.types";
import { agentsGovernanceApi } from "./agents.governance.service";

/**
 * Cliente tipado do frontend para a API nativa /agents (JWT SaaS via api.ts).
 * Não chama Paperclip externo.
 */
export const agentsApiService = {
  ...agentsGovernanceApi,

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
    input: {
      body: string;
      clientRequestId?: string;
      receipt?: {
        amountCents: number;
        currency: string;
        note?: string | null;
      };
    },
  ): Promise<AgentsComment> {
    const response = await api.post<AgentsComment>(
      `/agents/tasks/${encodeURIComponent(taskId)}/comments`,
      input,
    );
    return response.data;
  },

  async uploadCommentAttachment(
    taskId: string,
    commentId: string,
    file: File,
  ): Promise<AgentsCommentAttachment> {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<AgentsCommentAttachment>(
      `/agents/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}/attachments`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async addCommentReceipt(
    taskId: string,
    commentId: string,
    input: {
      amountCents: number;
      currency: string;
      note?: string | null;
    },
  ): Promise<AgentsCommentAttachment> {
    const response = await api.post<AgentsCommentAttachment>(
      `/agents/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}/receipts`,
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

  async getLiveDashboard(): Promise<AgentsLiveDashboard> {
    const response = await api.get<AgentsLiveDashboard>("/agents/live");
    return response.data;
  },

  async search(
    q: string,
    limit = 20,
  ): Promise<{
    query: string;
    agents: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      status: string | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      status: string | null;
    }>;
    projects: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      status: string | null;
    }>;
    goals: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      status: string | null;
    }>;
    artifacts: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      kind: string | null;
    }>;
  }> {
    const response = await api.get("/agents/search", {
      params: { q, limit },
    });
    return response.data;
  },

  async listActivity(params?: {
    agentId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgentsActivity[]> {
    const response = await api.get<AgentsActivity[]>("/agents/activity", {
      params,
    });
    return response.data;
  },

  async listSecretRefs(agentId: string): Promise<AgentsSecretRef[]> {
    const response = await api.get<AgentsSecretRef[]>(
      `/agents/${encodeURIComponent(agentId)}/secrets`,
    );
    return response.data;
  },

  async createSecretRef(
    agentId: string,
    input: { name: string; envRef: string; description?: string | null },
  ): Promise<AgentsSecretRef> {
    const response = await api.post<AgentsSecretRef>(
      `/agents/${encodeURIComponent(agentId)}/secrets`,
      input,
    );
    return response.data;
  },

  async deleteSecretRef(agentId: string, secretId: string): Promise<void> {
    await api.delete(
      `/agents/${encodeURIComponent(agentId)}/secrets/${encodeURIComponent(secretId)}`,
    );
  },

  async listTools(agentId: string): Promise<AgentsTool[]> {
    const response = await api.get<AgentsTool[]>(
      `/agents/${encodeURIComponent(agentId)}/tools`,
    );
    return response.data;
  },

  async upsertTool(
    agentId: string,
    input: {
      toolKey: string;
      enabled?: boolean;
      config?: Record<string, unknown>;
    },
  ): Promise<AgentsTool> {
    const response = await api.put<AgentsTool>(
      `/agents/${encodeURIComponent(agentId)}/tools`,
      input,
    );
    return response.data;
  },

  async getBudget(agentId: string): Promise<AgentsBudget> {
    const response = await api.get<AgentsBudget>(
      `/agents/${encodeURIComponent(agentId)}/budgets`,
    );
    return response.data;
  },

  async updateBudget(
    agentId: string,
    input: {
      period?: AgentsBudget["period"];
      softLimitCents?: number | null;
      hardLimitCents?: number | null;
      alertThresholdPct?: number;
    },
  ): Promise<AgentsBudget> {
    const response = await api.patch<AgentsBudget>(
      `/agents/${encodeURIComponent(agentId)}/budgets`,
      input,
    );
    return response.data;
  },
};
