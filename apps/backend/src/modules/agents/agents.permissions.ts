import {
  AGENT_SCOPES,
  type AgentScope,
  type AgentsActor,
  type TaskRecord,
  type TaskVisibility,
} from "./agents.types";

export function normalizeScopes(input: unknown): AgentScope[] {
  if (!Array.isArray(input)) return [...AGENT_SCOPES];
  const allowed = new Set<string>(AGENT_SCOPES);
  const scopes = input.filter(
    (value): value is AgentScope =>
      typeof value === "string" && allowed.has(value),
  );
  return scopes.length > 0 ? scopes : ["agents:read", "tasks:read"];
}

export function agentHasScope(
  scopes: AgentScope[],
  required: AgentScope,
): boolean {
  return scopes.includes(required);
}

export function isTenantAdmin(actor: AgentsActor): boolean {
  return actor.role === "admin" || actor.role === "superadmin";
}

export function canViewTask(
  actor: AgentsActor,
  task: Pick<TaskRecord, "visibility" | "createdByUserId">,
): boolean {
  if (task.visibility === "open") return true;
  if (isTenantAdmin(actor)) return true;
  return task.createdByUserId === actor.userId;
}

export function assertVisibilityForCreate(
  visibility: TaskVisibility,
  _actor: AgentsActor,
): TaskVisibility {
  return visibility;
}
