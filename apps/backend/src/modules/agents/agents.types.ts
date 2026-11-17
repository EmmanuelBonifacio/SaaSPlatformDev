export type AgentStatus = "idle" | "active" | "paused" | "error";
export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskVisibility = "open" | "private";
export type CommentAuthorType = "user" | "agent" | "system";
export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ActorRole = "user" | "admin" | "superadmin";

export const AGENT_SCOPES = [
  "agents:read",
  "tasks:read",
  "tasks:write",
  "comments:write",
  "agents:run",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export type AgentsActor = {
  userId: string;
  role: ActorRole;
};

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: AgentStatus;
  adapterType: string;
  capabilities: string | null;
  permissions: { scopes: AgentScope[]; requireRunApproval?: boolean };
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  visibility: TaskVisibility;
  assigneeAgentId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentRecord = {
  id: string;
  taskId: string;
  body: string;
  authorType: CommentAuthorType;
  authorUserId: string | null;
  authorAgentId: string | null;
  clientRequestId: string | null;
  createdAt: string;
};

export type RunRecord = {
  id: string;
  agentId: string;
  taskId: string | null;
  status: RunStatus;
  requestedByUserId: string;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type ApprovalRecord = {
  id: string;
  type: string;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  relatedTaskId: string | null;
  relatedRunId: string | null;
  requestedByUserId: string | null;
  decidedByUserId: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type ActivityRecord = {
  id: string;
  actorType: CommentAuthorType;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId: string | null;
  runId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type SkillStatus = "active" | "disabled";

export type SkillRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string;
  status: SkillStatus;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SkillAttachmentRecord = {
  id: string;
  skillId: string;
  agentId: string;
  createdAt: string;
};

export const CONNECTOR_KINDS = [
  "webhook",
  "mcp",
  "fleet_traccar",
  "fleet_fleetbase",
  "fleet_fleetms",
  "custom",
] as const;

export type ConnectorKind = (typeof CONNECTOR_KINDS)[number];
export type ConnectorStatus = "enabled" | "disabled";

export type ConnectorConfig = {
  host?: string;
  path?: string;
  label?: string;
};

export type ConnectorRecord = {
  id: string;
  name: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  config: ConnectorConfig;
  secretRef: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
