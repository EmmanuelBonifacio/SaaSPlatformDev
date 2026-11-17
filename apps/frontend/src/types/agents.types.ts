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
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type AgentsAgent = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: AgentStatus;
  adapterType: string;
  capabilities: string | null;
  permissions: {
    scopes: string[];
    requireRunApproval?: boolean;
  };
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentsTask = {
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

export type AgentsComment = {
  id: string;
  taskId: string;
  body: string;
  authorType: "user" | "agent" | "system";
  authorUserId: string | null;
  authorAgentId: string | null;
  createdAt: string;
};

export type AgentsRun = {
  id: string;
  agentId: string;
  taskId: string | null;
  status: string;
  requestedByUserId?: string;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
};

export type AgentsActivity = {
  id: string;
  actorType: "user" | "agent" | "system";
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId: string | null;
  runId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type AgentsApproval = {
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
    scopes?: string[];
    requireRunApproval?: boolean;
  };
};

export type UpdateAgentInput = Partial<CreateAgentInput> & {
  status?: AgentStatus;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  visibility?: TaskVisibility;
  assigneeAgentId?: string | null;
};

export type SkillStatus = "active" | "disabled";

export type AgentsSkill = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string;
  status: SkillStatus;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentsSkillAttachment = {
  id: string;
  skillId: string;
  agentId: string;
  createdAt: string;
};

export type CreateSkillInput = {
  name: string;
  slug?: string;
  description?: string | null;
  instructions?: string;
  status?: SkillStatus;
};

export type UpdateSkillInput = Partial<CreateSkillInput>;

export type ConnectorKind =
  | "webhook"
  | "mcp"
  | "fleet_traccar"
  | "fleet_fleetbase"
  | "fleet_fleetms"
  | "custom";

export type ConnectorStatus = "enabled" | "disabled";

export type ConnectorConfig = {
  host?: string;
  path?: string;
  label?: string;
};

export type AgentsConnector = {
  id: string;
  name: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  config: ConnectorConfig;
  secretRef: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateConnectorInput = {
  name: string;
  kind: ConnectorKind;
  status?: ConnectorStatus;
  config?: ConnectorConfig;
  secretRef?: string | null;
};

export type UpdateConnectorInput = Partial<CreateConnectorInput>;
