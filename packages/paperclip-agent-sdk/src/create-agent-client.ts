import { AgentClientError } from "./errors";
import type {
  AgentClient,
  AgentClientOptions,
  AgentSummary,
  CompanySummary,
  CreateCommentInput,
  CreateTaskInput,
  ListTasksOptions,
  RunAgentInput,
  TaskComment,
  TaskSummary,
} from "./types";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2_000_000;

function assertOrigin(baseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new AgentClientError("baseUrl inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AgentClientError("baseUrl deve usar http ou https.");
  }
  if (url.username || url.password) {
    throw new AgentClientError("baseUrl não pode conter credenciais.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new AgentClientError("baseUrl deve ser apenas a origem (sem path/query).");
  }
  return url;
}

function resolveAuthMode(options: AgentClientOptions): "apiKey" | "local_trusted" {
  if (options.authMode) return options.authMode;
  return options.apiKey ? "apiKey" : "local_trusted";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AgentClientError(`Resposta Paperclip sem campo obrigatório: ${field}.`);
  }
  return value;
}

function mapAgent(raw: unknown): AgentSummary {
  if (!isRecord(raw)) {
    throw new AgentClientError("Agente Paperclip inválido.");
  }
  return {
    id: requireString(raw.id, "agent.id"),
    name: requireString(raw.name, "agent.name"),
    role: asString(raw.role),
    title: raw.title === null ? null : asString(raw.title),
    status: asString(raw.status),
  };
}

function mapTask(raw: unknown): TaskSummary {
  if (!isRecord(raw)) {
    throw new AgentClientError("Tarefa Paperclip inválida.");
  }
  return {
    id: requireString(raw.id, "task.id"),
    identifier: asString(raw.identifier),
    title: requireString(raw.title, "task.title"),
    description: raw.description === null ? null : asString(raw.description),
    status: requireString(raw.status, "task.status"),
    priority: asString(raw.priority),
    assigneeAgentId:
      raw.assigneeAgentId === null ? null : asString(raw.assigneeAgentId),
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt),
  };
}

function mapComment(raw: unknown): TaskComment {
  if (!isRecord(raw)) {
    throw new AgentClientError("Comentário Paperclip inválido.");
  }
  const authorType = asString(raw.authorType);
  return {
    id: requireString(raw.id, "comment.id"),
    body: typeof raw.body === "string" ? raw.body : requireString(raw.body, "comment.body"),
    authorType:
      authorType === "user" || authorType === "agent" || authorType === "system"
        ? authorType
        : undefined,
    authorAgentId:
      raw.authorAgentId === null ? null : asString(raw.authorAgentId),
    createdAt: requireString(raw.createdAt, "comment.createdAt"),
  };
}

function mapCompany(raw: unknown): CompanySummary {
  if (!isRecord(raw)) {
    throw new AgentClientError("Empresa Paperclip inválida.");
  }
  return {
    id: requireString(raw.id, "company.id"),
    name: requireString(raw.name, "company.name"),
    description:
      raw.description === null ? null : asString(raw.description),
  };
}

function parseTaskList(payload: unknown): TaskSummary[] {
  if (Array.isArray(payload)) {
    return payload.map(mapTask);
  }
  if (isRecord(payload) && Array.isArray(payload.items)) {
    return payload.items.map(mapTask);
  }
  throw new AgentClientError("Lista de tarefas Paperclip inválida.");
}

/**
 * Cliente HTTP para a API de agentes Paperclip.
 * A autenticação do usuário final permanece no SaaS; este client só fala com o Paperclip.
 */
export function createAgentClient(options: AgentClientOptions): AgentClient {
  const origin = assertOrigin(options.baseUrl);
  const authMode = resolveAuthMode(options);
  const apiKey = options.apiKey?.trim() || undefined;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (authMode === "apiKey" && !apiKey) {
    throw new AgentClientError(
      "apiKey é obrigatória quando authMode=apiKey.",
      { statusCode: 500 },
    );
  }
  if (authMode === "local_trusted" && apiKey) {
    throw new AgentClientError(
      "Não combine apiKey com authMode=local_trusted.",
      { statusCode: 500 },
    );
  }

  async function request(
    path: string,
    method: "GET" | "POST" | "PATCH",
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const url = new URL(`/api${path}`, origin);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (authMode === "apiKey" && apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new AgentClientError("O serviço de agentes está indisponível.");
    }

    let responseText: string;
    try {
      responseText = await response.text();
    } catch {
      throw new AgentClientError("O serviço de agentes está indisponível.");
    }

    if (Buffer.byteLength(responseText, "utf8") > maxResponseBytes) {
      throw new AgentClientError(
        "A resposta do serviço de agentes excedeu o limite.",
      );
    }

    if (!response.ok) {
      throw new AgentClientError("O serviço de agentes está indisponível.", {
        causeStatus: response.status,
      });
    }

    if (!responseText) return null;

    try {
      return JSON.parse(responseText) as unknown;
    } catch {
      throw new AgentClientError(
        "O serviço de agentes retornou uma resposta inválida.",
      );
    }
  }

  return {
    async listCompanies() {
      const payload = await request("/companies", "GET");
      if (!Array.isArray(payload)) {
        throw new AgentClientError("Lista de empresas Paperclip inválida.");
      }
      return payload.map(mapCompany);
    },

    async createCompany(name, description) {
      return mapCompany(
        await request("/companies", "POST", { name, description }),
      );
    },

    async listAgents(companyId) {
      const payload = await request(
        `/companies/${encodeURIComponent(companyId)}/agents`,
        "GET",
      );
      if (!Array.isArray(payload)) {
        throw new AgentClientError("Lista de agentes Paperclip inválida.");
      }
      return payload.map(mapAgent);
    },

    async getAgent(agentId) {
      return mapAgent(
        await request(`/agents/${encodeURIComponent(agentId)}`, "GET"),
      );
    },

    async listTasks(companyId, options: ListTasksOptions = {}) {
      const query = new URLSearchParams({
        view: "index",
        limit: String(options.limit ?? 50),
        offset: String(options.offset ?? 0),
        sortField: "created",
        sortDir: "desc",
      });
      return parseTaskList(
        await request(
          `/companies/${encodeURIComponent(companyId)}/issues?${query}`,
          "GET",
        ),
      );
    },

    async createTask(companyId, input: CreateTaskInput) {
      return mapTask(
        await request(
          `/companies/${encodeURIComponent(companyId)}/issues`,
          "POST",
          {
            title: input.title,
            description: input.description ?? "",
            status: input.status ?? "backlog",
          },
        ),
      );
    },

    async getTask(taskId) {
      return mapTask(
        await request(`/issues/${encodeURIComponent(taskId)}`, "GET"),
      );
    },

    async updateTask(taskId, input) {
      return mapTask(
        await request(`/issues/${encodeURIComponent(taskId)}`, "PATCH", {
          ...input,
        }),
      );
    },

    async listComments(taskId) {
      const payload = await request(
        `/issues/${encodeURIComponent(taskId)}/comments?order=asc&limit=100`,
        "GET",
      );
      if (!Array.isArray(payload)) {
        throw new AgentClientError("Lista de comentários Paperclip inválida.");
      }
      return payload.map(mapComment);
    },

    async createComment(taskId, input: CreateCommentInput) {
      return mapComment(
        await request(
          `/issues/${encodeURIComponent(taskId)}/comments`,
          "POST",
          {
            body: input.body,
            ...(input.clientRequestId
              ? { clientRequestId: input.clientRequestId }
              : {}),
          },
        ),
      );
    },

    async runAgent(agentId, input: RunAgentInput = {}) {
      return request(`/agents/${encodeURIComponent(agentId)}/wakeup`, "POST", {
        source: input.source ?? "on_demand",
        ...(input.issueId ? { issueId: input.issueId } : {}),
      });
    },
  };
}
