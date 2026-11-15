import { z } from "zod";
import { env } from "../../config/env";
import {
  paperclipAgentSchema,
  paperclipCommentSchema,
  paperclipIssueSchema,
  type PaperclipAgent,
  type PaperclipComment,
  type PaperclipIssue,
} from "./paperclip.types";

const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

const issueListSchema = z.union([
  z.array(paperclipIssueSchema),
  z.object({ items: z.array(paperclipIssueSchema) }),
]);

export class PaperclipApiError extends Error {
  readonly statusCode = 502;

  constructor(message = "O serviço de agentes está indisponível.") {
    super(message);
    this.name = "PaperclipApiError";
  }
}

export class PaperclipApiService {
  async listCompanies() {
    return this.request("/companies", "GET", z.array(companySchema));
  }

  async createCompany(name: string, description: string) {
    return this.request(
      "/companies",
      "POST",
      companySchema,
      { name, description },
    );
  }

  async listAgents(companyId: string): Promise<PaperclipAgent[]> {
    return this.request(
      `/companies/${encodeURIComponent(companyId)}/agents`,
      "GET",
      z.array(paperclipAgentSchema),
    );
  }

  async listIssues(
    companyId: string,
    limit: number,
    offset: number,
  ): Promise<PaperclipIssue[]> {
    const query = new URLSearchParams({
      view: "index",
      limit: String(limit),
      offset: String(offset),
      sortField: "created",
      sortDir: "desc",
    });
    const response = await this.request(
      `/companies/${encodeURIComponent(companyId)}/issues?${query}`,
      "GET",
      issueListSchema,
    );
    return Array.isArray(response) ? response : response.items;
  }

  async createIssue(
    companyId: string,
    input: { title: string; description: string; status: "backlog" },
  ): Promise<PaperclipIssue> {
    return this.request(
      `/companies/${encodeURIComponent(companyId)}/issues`,
      "POST",
      paperclipIssueSchema,
      input,
    );
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
    return this.request(
      `/issues/${encodeURIComponent(issueId)}`,
      "PATCH",
      paperclipIssueSchema,
      input,
    );
  }

  async getIssue(issueId: string): Promise<PaperclipIssue> {
    return this.request(
      `/issues/${encodeURIComponent(issueId)}`,
      "GET",
      paperclipIssueSchema,
    );
  }

  async listComments(issueId: string): Promise<PaperclipComment[]> {
    return this.request(
      `/issues/${encodeURIComponent(issueId)}/comments?order=asc&limit=100`,
      "GET",
      z.array(paperclipCommentSchema),
    );
  }

  async addComment(
    issueId: string,
    body: string,
    clientRequestId: string,
  ): Promise<PaperclipComment> {
    return this.request(
      `/issues/${encodeURIComponent(issueId)}/comments`,
      "POST",
      paperclipCommentSchema,
      { body, clientRequestId },
    );
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PATCH",
    schema: z.ZodType<T>,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`/api${path}`, env.PAPERCLIP_API_URL);
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new PaperclipApiError();
    }

    let responseText: string;
    try {
      responseText = await response.text();
    } catch {
      throw new PaperclipApiError();
    }
    if (Buffer.byteLength(responseText, "utf8") > 2_000_000) {
      throw new PaperclipApiError("A resposta do serviço de agentes excedeu o limite.");
    }
    if (!response.ok) {
      throw new PaperclipApiError();
    }

    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new PaperclipApiError("O serviço de agentes retornou uma resposta inválida.");
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new PaperclipApiError("O serviço de agentes retornou dados incompatíveis.");
    }
    return parsed.data;
  }
}

export const paperclipApiService = new PaperclipApiService();
