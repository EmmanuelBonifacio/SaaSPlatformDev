import type {
  AgentRecord,
  ApprovalRecord,
  CommentRecord,
  CreateAgentInput,
  CreateCommentInput,
  CreateRunInput,
  CreateTaskInput,
  DecideApprovalInput,
  Pagination,
  RunRecord,
  TaskRecord,
} from "./types.js";

export type AgentsClientOptions = {
  /** Origem do backend SaaS, ex.: http://127.0.0.1:3000 (sem path). */
  baseUrl: string;
  /** JWT SaaS (Bearer). Nunca use chave Paperclip. */
  getAccessToken: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class AgentsSdkError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AgentsSdkError";
  }
}

function assertOrigin(baseUrl: string): URL {
  const url = new URL(baseUrl);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new AgentsSdkError(
      400,
      "baseUrl deve ser uma origem HTTP(S) sem path, query ou credenciais.",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AgentsSdkError(400, "baseUrl deve usar http ou https.");
  }
  return url;
}

function query(params?: Pagination & { status?: string }): string {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  if (params.status) search.set("status", params.status);
  const value = search.toString();
  return value ? `?${value}` : "";
}

export function createAgentsClient(options: AgentsClientOptions) {
  const origin = assertOrigin(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;

  async function request<T>(
    path: string,
    method: "GET" | "POST" | "PATCH",
    body?: object,
  ): Promise<T> {
    const token = await options.getAccessToken();
    if (!token || typeof token !== "string") {
      throw new AgentsSdkError(401, "Token JWT SaaS ausente.");
    }
    const url = new URL(path, origin);
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new AgentsSdkError(502, "Falha ao contactar a API /agents.");
    }

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > 2_000_000) {
      throw new AgentsSdkError(502, "Resposta /agents excedeu o limite.");
    }
    if (!response.ok) {
      throw new AgentsSdkError(
        response.status,
        `API /agents respondeu ${response.status}.`,
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AgentsSdkError(502, "Resposta /agents inválida.");
    }
  }

  return {
    listAgents(params?: Pagination) {
      return request<AgentRecord[]>(`/agents${query(params)}`, "GET");
    },
    getAgent(agentId: string) {
      return request<AgentRecord>(`/agents/${encodeURIComponent(agentId)}`, "GET");
    },
    createAgent(input: CreateAgentInput) {
      return request<AgentRecord>("/agents", "POST", input);
    },
    updateAgent(agentId: string, input: Partial<CreateAgentInput> & { status?: string }) {
      return request<AgentRecord>(
        `/agents/${encodeURIComponent(agentId)}`,
        "PATCH",
        input,
      );
    },
    listTasks(params?: Pagination) {
      return request<TaskRecord[]>(`/agents/tasks${query(params)}`, "GET");
    },
    getTask(taskId: string) {
      return request<TaskRecord>(
        `/agents/tasks/${encodeURIComponent(taskId)}`,
        "GET",
      );
    },
    createTask(input: CreateTaskInput) {
      return request<TaskRecord>("/agents/tasks", "POST", input);
    },
    updateTask(taskId: string, input: Partial<CreateTaskInput>) {
      return request<TaskRecord>(
        `/agents/tasks/${encodeURIComponent(taskId)}`,
        "PATCH",
        input,
      );
    },
    listComments(taskId: string) {
      return request<CommentRecord[]>(
        `/agents/tasks/${encodeURIComponent(taskId)}/comments`,
        "GET",
      );
    },
    createComment(taskId: string, input: CreateCommentInput) {
      return request<CommentRecord>(
        `/agents/tasks/${encodeURIComponent(taskId)}/comments`,
        "POST",
        input,
      );
    },
    createRun(agentId: string, input: CreateRunInput = {}) {
      return request<{ run: RunRecord; approval: ApprovalRecord | null }>(
        `/agents/${encodeURIComponent(agentId)}/runs`,
        "POST",
        input,
      );
    },
    listApprovals(params?: Pagination & { status?: string }) {
      return request<ApprovalRecord[]>(`/agents/approvals${query(params)}`, "GET");
    },
    decideApproval(approvalId: string, input: DecideApprovalInput) {
      return request<ApprovalRecord>(
        `/agents/approvals/${encodeURIComponent(approvalId)}/decide`,
        "POST",
        input,
      );
    },
  };
}

export type AgentsClient = ReturnType<typeof createAgentsClient>;
