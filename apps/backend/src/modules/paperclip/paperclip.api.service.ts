import {
  AgentClientError,
  createAgentClient,
  type AgentClient,
} from "@saasplatform/paperclip-agent-sdk";
import { env } from "../../config/env";
import type {
  PaperclipAgent,
  PaperclipComment,
  PaperclipIssue,
} from "./paperclip.types";

export class PaperclipApiError extends Error {
  readonly statusCode = 502;

  constructor(message = "O serviço de agentes está indisponível.") {
    super(message);
    this.name = "PaperclipApiError";
  }
}

function toApiError(error: unknown): never {
  if (error instanceof AgentClientError) {
    throw new PaperclipApiError(error.message);
  }
  throw new PaperclipApiError();
}

function createPaperclipClient(): AgentClient {
  if (env.PAPERCLIP_AUTH_MODE === "apiKey") {
    return createAgentClient({
      baseUrl: env.PAPERCLIP_API_URL,
      apiKey: env.PAPERCLIP_API_KEY,
      authMode: "apiKey",
    });
  }
  return createAgentClient({
    baseUrl: env.PAPERCLIP_API_URL,
    authMode: "local_trusted",
  });
}

/**
 * Adaptador do módulo Paperclip sobre `@saasplatform/paperclip-agent-sdk`.
 * Mantém a assinatura usada pelo service; autenticação do usuário SaaS permanece
 * nas rotas Fastify (JWT + tenant). Aqui só há a credencial máquina→Paperclip.
 */
export class PaperclipApiService {
  private readonly client: AgentClient;

  constructor(client: AgentClient = createPaperclipClient()) {
    this.client = client;
  }

  async listCompanies() {
    try {
      return await this.client.listCompanies();
    } catch (error) {
      return toApiError(error);
    }
  }

  async createCompany(name: string, description: string) {
    try {
      return await this.client.createCompany(name, description);
    } catch (error) {
      return toApiError(error);
    }
  }

  async listAgents(companyId: string): Promise<PaperclipAgent[]> {
    try {
      return await this.client.listAgents(companyId);
    } catch (error) {
      return toApiError(error);
    }
  }

  async listIssues(
    companyId: string,
    limit: number,
    offset: number,
  ): Promise<PaperclipIssue[]> {
    try {
      return await this.client.listTasks(companyId, { limit, offset });
    } catch (error) {
      return toApiError(error);
    }
  }

  async createIssue(
    companyId: string,
    input: { title: string; description: string; status: "backlog" },
  ): Promise<PaperclipIssue> {
    try {
      return await this.client.createTask(companyId, input);
    } catch (error) {
      return toApiError(error);
    }
  }

  async updateIssue(
    issueId: string,
    input: {
      title: string;
      description: string;
      status: "todo";
      assigneeAgentId: string;
    },
  ): Promise<PaperclipIssue> {
    try {
      return await this.client.updateTask(issueId, input);
    } catch (error) {
      return toApiError(error);
    }
  }

  async getIssue(issueId: string): Promise<PaperclipIssue> {
    try {
      return await this.client.getTask(issueId);
    } catch (error) {
      return toApiError(error);
    }
  }

  async listComments(issueId: string): Promise<PaperclipComment[]> {
    try {
      return await this.client.listComments(issueId);
    } catch (error) {
      return toApiError(error);
    }
  }

  async addComment(
    issueId: string,
    body: string,
    clientRequestId: string,
  ): Promise<PaperclipComment> {
    try {
      return await this.client.createComment(issueId, {
        body,
        clientRequestId,
      });
    } catch (error) {
      return toApiError(error);
    }
  }

  async runAgent(agentId: string, issueId?: string): Promise<unknown> {
    try {
      return await this.client.runAgent(agentId, {
        source: "on_demand",
        ...(issueId ? { issueId } : {}),
      });
    } catch (error) {
      return toApiError(error);
    }
  }
}

export const paperclipApiService = new PaperclipApiService();
