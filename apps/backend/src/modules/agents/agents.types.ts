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
