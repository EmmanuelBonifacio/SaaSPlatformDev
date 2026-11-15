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
export type AgentScope =
  | "agents:read"
  | "tasks:read"
  | "tasks:write"
  | "comments:write"
  | "agents:run";

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

export type CreateAgentInput = {
  name: string;
  role?: string;
  title?: string | null;
  adapterType?: string;
  capabilities?: string | null;
  permissions?: {
    scopes?: AgentScope[];
    requireRunApproval?: boolean;
  };
};

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  visibility?: TaskVisibility;
  assigneeAgentId?: string | null;
};

export type CreateCommentInput = {
  body: string;
  clientRequestId?: string;
};

export type CreateRunInput = {
  taskId?: string | null;
};

export type DecideApprovalInput = {
  decision: "approved" | "rejected";
  decisionNote?: string | null;
};

export type Pagination = {
  limit?: number;
  offset?: number;
};
