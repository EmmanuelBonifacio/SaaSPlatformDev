export type PaperclipAuthMode = "apiKey" | "local_trusted";

export type AgentClientOptions = {
  /** Origem HTTP(S) do Paperclip, sem path (ex.: http://127.0.0.1:3100). */
  baseUrl: string;
  /**
   * Chave SDK (`pcp_sdk_…`) enviada como `Authorization: Bearer`.
   * Obrigatória quando `authMode` é `apiKey` (padrão).
   */
  apiKey?: string;
  /**
   * `apiKey` — produção/alvo: Bearer obrigatório.
   * `local_trusted` — apenas rede restrita/loopback; sem header de auth.
   */
  authMode?: PaperclipAuthMode;
  /** Timeout por requisição em ms (padrão 8000). */
  timeoutMs?: number;
  /** Limite máximo do corpo da resposta em bytes (padrão 2 MiB). */
  maxResponseBytes?: number;
  /** Injete `fetch` nos testes. */
  fetchImpl?: typeof fetch;
};

export type AgentSummary = {
  id: string;
  name: string;
  role?: string;
  title?: string | null;
  status?: string;
};

export type TaskSummary = {
  id: string;
  identifier?: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string;
  assigneeAgentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskComment = {
  id: string;
  body: string;
  authorType?: "user" | "agent" | "system";
  authorAgentId?: string | null;
  createdAt: string;
};

export type CompanySummary = {
  id: string;
  name: string;
  description?: string | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: string;
};

export type CreateCommentInput = {
  body: string;
  clientRequestId?: string;
};

export type RunAgentInput = {
  source?: string;
  issueId?: string;
};

export type ListTasksOptions = {
  limit?: number;
  offset?: number;
};

export type AgentClient = {
  listCompanies(): Promise<CompanySummary[]>;
  createCompany(name: string, description: string): Promise<CompanySummary>;
  listAgents(companyId: string): Promise<AgentSummary[]>;
  getAgent(agentId: string): Promise<AgentSummary>;
  listTasks(companyId: string, options?: ListTasksOptions): Promise<TaskSummary[]>;
  createTask(companyId: string, input: CreateTaskInput): Promise<TaskSummary>;
  getTask(taskId: string): Promise<TaskSummary>;
  updateTask(
    taskId: string,
    input: Partial<CreateTaskInput> & {
      status?: string;
      assigneeAgentId?: string;
    },
  ): Promise<TaskSummary>;
  listComments(taskId: string): Promise<TaskComment[]>;
  createComment(taskId: string, input: CreateCommentInput): Promise<TaskComment>;
  runAgent(agentId: string, input?: RunAgentInput): Promise<unknown>;
};
