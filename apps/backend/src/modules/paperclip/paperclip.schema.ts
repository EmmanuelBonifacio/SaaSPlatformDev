import { z } from "zod";

export const conversationParamsSchema = z.object({
  conversationId: z.string().uuid(),
});

export const createConversationSchema = z.object({
  agentId: z.string().min(1).max(100),
  clientRequestId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});

export const sendMessageSchema = z.object({
  clientRequestId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});

export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
