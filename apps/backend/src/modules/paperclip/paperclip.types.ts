import { z } from "zod";

export const paperclipAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().optional(),
  title: z.string().nullable().optional(),
  status: z.string().optional(),
});

export const paperclipIssueSchema = z.object({
  id: z.string().min(1),
  identifier: z.string().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1),
  priority: z.string().optional(),
  assigneeAgentId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const paperclipCommentSchema = z.object({
  id: z.string().min(1),
  body: z.string(),
  authorType: z.enum(["user", "agent", "system"]).optional(),
  authorAgentId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type PaperclipAgent = z.infer<typeof paperclipAgentSchema>;
export type PaperclipIssue = z.infer<typeof paperclipIssueSchema>;
export type PaperclipComment = z.infer<typeof paperclipCommentSchema>;

export interface PaperclipConversation {
  id: string;
  ownerUserId: string;
  clientRequestId: string;
  agentId: string;
  issueId: string | null;
  title: string;
  initialMessage: string;
  state: "creating" | "pending" | "active" | "failed";
  createdAt: Date;
}

export interface PaperclipMessage {
  id: string;
  body: string;
  author: "user" | "agent" | "system";
  createdAt: string;
}
