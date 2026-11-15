/**
 * @deprecated SP-7 fase 5 — ponte Paperclip desligada.
 * Rotas não estão registradas; métodos falham fechado (410).
 */
import { PaperclipApiError } from "./paperclip.api.service";
import type {
  CreateConversationDto,
  ListTasksQuery,
  SendMessageDto,
} from "./paperclip.schema";
import type { TenantContext } from "../../core/types/fastify";

export class PaperclipService {
  private fail(): never {
    throw new PaperclipApiError();
  }

  async listAgents(_tenant: TenantContext) {
    return this.fail();
  }

  async listTasks(
    _tenant: TenantContext,
    _userId: string,
    _query: ListTasksQuery,
  ) {
    return this.fail();
  }

  async listConversations(_tenant: TenantContext, _userId: string) {
    return this.fail();
  }

  async createConversation(
    _tenant: TenantContext,
    _userId: string,
    _input: CreateConversationDto,
  ) {
    return this.fail();
  }

  async getMessages(
    _tenant: TenantContext,
    _userId: string,
    _conversationId: string,
  ) {
    return this.fail();
  }

  async sendMessage(
    _tenant: TenantContext,
    _userId: string,
    _conversationId: string,
    _input: SendMessageDto,
  ) {
    return this.fail();
  }
}

export const paperclipService = new PaperclipService();
