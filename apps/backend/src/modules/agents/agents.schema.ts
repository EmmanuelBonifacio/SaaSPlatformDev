import { z } from "zod";
import { AGENT_SCOPES, CONNECTOR_KINDS } from "./agents.types";

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
  entityType: z.string().trim().min(1).max(64).optional(),
  entityId: z.string().trim().min(1).max(64).optional(),
});

export const skillIdParamSchema = z.object({
  skillId: z.string().uuid(),
});

export const createSkillSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  instructions: z.string().trim().max(20000).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const updateSkillSchema = createSkillSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const attachSkillSchema = z.object({
  agentId: z.string().uuid(),
});

export const skillAttachmentParamSchema = z.object({
  skillId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export const connectorIdParamSchema = z.object({
  connectorId: z.string().uuid(),
});

const connectorConfigSchema = z
  .object({
    host: z.string().trim().max(500).optional(),
    path: z.string().trim().max(200).optional(),
    label: z.string().trim().max(160).optional(),
  })
  .strict();

const secretRefSchema = z
  .string()
  .trim()
  .max(128)
  .regex(/^[A-Z][A-Z0-9_]*$/, "secretRef deve ser nome de env (A-Z0-9_)")
  .nullable()
  .optional();

export const createConnectorSchema = z.object({
  name: z.string().trim().min(1).max(160),
  kind: z.enum(CONNECTOR_KINDS),
  status: z.enum(["enabled", "disabled"]).optional(),
  config: connectorConfigSchema.optional(),
  secretRef: secretRefSchema,
});

export const updateConnectorSchema = createConnectorSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;
export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type CreateRunDto = z.infer<typeof createRunSchema>;
export type DecideApprovalDto = z.infer<typeof decideApprovalSchema>;
export type CreateSkillDto = z.infer<typeof createSkillSchema>;
export type UpdateSkillDto = z.infer<typeof updateSkillSchema>;
export type AttachSkillDto = z.infer<typeof attachSkillSchema>;
export type CreateConnectorDto = z.infer<typeof createConnectorSchema>;
export type UpdateConnectorDto = z.infer<typeof updateConnectorSchema>;
