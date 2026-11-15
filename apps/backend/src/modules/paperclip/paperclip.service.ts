import { PaperclipApiError, paperclipApiService } from "./paperclip.api.service";
import { PaperclipModuleError } from "./paperclip.errors";
import {
  filterVisibleTasks,
  PRIVATE_TASK_PREFIX,
} from "./paperclip.presentation";
import {
  createOrGetConversation,
  ensurePaperclipCompany,
  getConversation,
  listConversationOwners,
  listConversations,
  setConversationActive,
} from "./paperclip.repository";
import type {
  PaperclipAgent,
  PaperclipConversation,
  PaperclipIssue,
  PaperclipMessage,
} from "./paperclip.types";
import type { CreateConversationDto, ListTasksQuery, SendMessageDto } from "./paperclip.schema";
import type { TenantContext } from "../../core/types/fastify";

function mapAgent(agent: PaperclipAgent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role ?? null,
    title: agent.title ?? null,
    status: agent.status ?? "unknown",
  };
}

function mapConversation(conversation: PaperclipConversation) {
  return {
    id: conversation.id,
    agentId: conversation.agentId,
    title: conversation.title,
    state: conversation.state,
    createdAt: conversation.createdAt.toISOString(),
  };
}

function requireIssueId(conversation: PaperclipConversation): string {
  if (!conversation.issueId) {
    throw new PaperclipApiError("A conversa ainda não está disponível.");
  }
  return conversation.issueId;
}

async function getCompanyId(tenant: TenantContext): Promise<string> {
  return ensurePaperclipCompany(
    tenant.schemaName,
    tenant.id,
    tenant.name,
    () => paperclipApiService.listCompanies(),
    (name, marker) => paperclipApiService.createCompany(name, marker),
  ).catch((error: unknown) => {
    if (error instanceof PaperclipApiError) throw error;
    throw new PaperclipApiError();
  });
}

async function activateConversation(
  tenant: TenantContext,
  ownerUserId: string,
  conversation: PaperclipConversation,
): Promise<PaperclipConversation> {
  if (conversation.state === "active") return conversation;
  const issueId = requireIssueId(conversation);
  await paperclipApiService.updateIssue(issueId, {
    title: conversation.title,
    description: conversation.initialMessage,
    status: "todo",
    assigneeAgentId: conversation.agentId,
  });
  await setConversationActive(tenant.schemaName, conversation.id, ownerUserId);
  return {
    ...conversation,
    state: "active",
    initialMessage: "",
  };
}

export class PaperclipService {
  async listAgents(tenant: TenantContext) {
    const companyId = await getCompanyId(tenant);
    return (await paperclipApiService.listAgents(companyId)).map(mapAgent);
  }

  async listTasks(
    tenant: TenantContext,
    userId: string,
    query: ListTasksQuery,
  ) {
    const companyId = await getCompanyId(tenant);
    const [issues, owners] = await Promise.all([
      paperclipApiService.listIssues(companyId, query.limit, query.offset),
      listConversationOwners(tenant.schemaName),
    ]);
    return filterVisibleTasks(issues, owners, userId);
  }

  async listConversations(tenant: TenantContext, userId: string) {
    const conversations = await listConversations(tenant.schemaName, userId);
    return conversations.map(mapConversation);
  }

  async createConversation(
    tenant: TenantContext,
    userId: string,
    input: CreateConversationDto,
  ) {
    const companyId = await getCompanyId(tenant);
    const agents = await paperclipApiService.listAgents(companyId);
    const agent = agents.find((item) => item.id === input.agentId);
    if (!agent) {
      throw new PaperclipModuleError(404, "Agente não encontrado.");
    }

    const title = `Conversa com ${agent.name}`;
    const conversation = await createOrGetConversation(
      tenant.schemaName,
      userId,
      input.clientRequestId,
      agent.id,
      title,
      input.message,
      (conversationId) =>
        paperclipApiService.createIssue(companyId, {
          title: `${PRIVATE_TASK_PREFIX}${conversationId}`,
          description: input.message,
          status: "backlog",
        }),
    );
    const activeConversation = await activateConversation(
      tenant,
      userId,
      conversation,
    );
    return mapConversation(activeConversation);
  }

  async getMessages(
    tenant: TenantContext,
    userId: string,
    conversationId: string,
  ): Promise<PaperclipMessage[]> {
    const conversation = await this.findConversation(
      tenant,
      userId,
      conversationId,
    );
    const issueId = requireIssueId(conversation);
    const [issue, comments] = await Promise.all([
      paperclipApiService.getIssue(issueId),
      paperclipApiService.listComments(issueId),
    ]);
    const initialMessage: PaperclipMessage[] = issue.description
      ? [{
          id: `initial-${issue.id}`,
          body: issue.description,
          author: "user",
          createdAt: issue.createdAt ?? conversation.createdAt.toISOString(),
        }]
      : [];
    return initialMessage.concat(
      comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        author: comment.authorType ?? (comment.authorAgentId ? "agent" : "user"),
        createdAt: comment.createdAt,
      })),
    );
  }

  async sendMessage(
    tenant: TenantContext,
    userId: string,
    conversationId: string,
    input: SendMessageDto,
  ) {
    const conversation = await this.findConversation(
      tenant,
      userId,
      conversationId,
    );
    const activeConversation = await activateConversation(
      tenant,
      userId,
      conversation,
    );
    const comment = await paperclipApiService.addComment(
      requireIssueId(activeConversation),
      input.message,
      input.clientRequestId,
    );
    return {
      id: comment.id,
      body: comment.body,
      author: comment.authorType ?? "user",
      createdAt: comment.createdAt,
    };
  }

  private async findConversation(
    tenant: TenantContext,
    userId: string,
    conversationId: string,
  ): Promise<PaperclipConversation> {
    const conversation = await getConversation(
      tenant.schemaName,
      conversationId,
      userId,
    );
    if (!conversation || conversation.state === "failed") {
      throw new PaperclipModuleError(404, "Conversa não encontrada.");
    }
    return conversation;
  }
}

export const paperclipService = new PaperclipService();
