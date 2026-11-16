import { z } from "zod";
import { AGENT_SCOPES } from "./agents.types";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const agentIdParamSchema = z.object({
  agentId: z.string().uuid(),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid(),
});

export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(64).default("general"),
  title: z.string().trim().max(160).nullable().optional(),
  adapterType: z.string().trim().min(1).max(64).default("stub"),
  capabilities: z.string().trim().max(2000).nullable().optional(),
  permissions: z
    .object({
      scopes: z.array(z.enum(AGENT_SCOPES)).max(10).optional(),
      requireRunApproval: z.boolean().optional(),
    })
    .optional(),
});

export const updateAgentSchema = createAgentSchema
  .partial()
  .extend({
    status: z.enum(["idle", "active", "paused", "error"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(8000).nullable().optional(),
  status: z
    .enum(["backlog", "todo", "in_progress", "blocked", "done", "cancelled"])
    .default("backlog"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  visibility: z.enum(["open", "private"]).default("open"),
  assigneeAgentId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  clientRequestId: z.string().uuid().optional(),
});

export const createRunSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
});

export const decideApprovalSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decisionNote: z.string().trim().max(1000).nullable().optional(),
});

export const listApprovalsQuerySchema = paginationSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const runIdParamSchema = z.object({
  runId: z.string().uuid(),
});

export const listRunsQuerySchema = paginationSchema.extend({
  agentId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
});

export const listActivityQuerySchema = paginationSchema.extend({
  agentId: z.string().uuid().optional(),
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;
export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type CreateRunDto = z.infer<typeof createRunSchema>;
export type DecideApprovalDto = z.infer<typeof decideApprovalSchema>;
