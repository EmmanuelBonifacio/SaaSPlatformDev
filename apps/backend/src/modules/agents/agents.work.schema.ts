import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  starred: z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo.",
  });

export const createRoutineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  scheduleCron: z.string().trim().max(120).nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const updateRoutineSchema = createRoutineSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo.",
  });

export const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const updateGoalSchema = createGoalSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo.",
  });

export const createArtifactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["note", "file", "link", "plan", "output"]).default("note"),
  content: z.string().trim().max(50000).nullable().optional(),
  uri: z.string().trim().max(1000).nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const updateArtifactSchema = createArtifactSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo.",
  });

export const createCaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  status: z
    .enum(["open", "in_progress", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
  assigneeAgentId: z.string().uuid().nullable().optional(),
});

export const updateCaseSchema = createCaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo.",
  });

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  kind: z.enum(["execution", "shared", "personal"]).optional(),
  projectId: z.string().uuid().nullable().optional(),
  workingDirectory: z.string().trim().max(500).nullable().optional(),
  uri: z.string().trim().max(1000).nullable().optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Informe ao menos um campo.",
  });

export const workIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type CreateRoutineDto = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineDto = z.infer<typeof updateRoutineSchema>;
export type CreateGoalDto = z.infer<typeof createGoalSchema>;
export type UpdateGoalDto = z.infer<typeof updateGoalSchema>;
export type CreateArtifactDto = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactDto = z.infer<typeof updateArtifactSchema>;
export type CreateCaseDto = z.infer<typeof createCaseSchema>;
export type UpdateCaseDto = z.infer<typeof updateCaseSchema>;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
