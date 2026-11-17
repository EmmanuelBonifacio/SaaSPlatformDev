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

export type AgentHarness = {
  model?: string;
  maxTurns?: number;
  workingDirectory?: string;
  runtime?: string;
  notes?: string;
};

export const AGENT_ADAPTER_OPTIONS = [
  "stub",
  "http_webhook",
  "claude",
  "cursor",
  "codex",
  "gemini",
] as const;

export type AgentAdapterOption = (typeof AGENT_ADAPTER_OPTIONS)[number];

export const AGENT_TOOL_KEYS = [
  "web_search",
  "http_fetch",
  "code_exec",
  "filesystem",
  "memory",
  "fleet_bridge",
] as const;

export type AgentToolKey = (typeof AGENT_TOOL_KEYS)[number];

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: AgentStatus;
  adapterType: string;
  capabilities: string | null;
  instructions: string | null;
  harness: AgentHarness;
  permissions: { scopes: AgentScope[]; requireRunApproval?: boolean };
  lastHeartbeatAt: string | null;
  reportsToAgentId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentSecretRefRecord = {
  id: string;
  agentId: string;
  name: string;
  envRef: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentToolRecord = {
  id: string;
  agentId: string;
  toolKey: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentBudgetRecord = {
  agentId: string;
  period: "day" | "week" | "month";
  softLimitCents: number | null;
  hardLimitCents: number | null;
  spentCents: number;
  alertThresholdPct: number;
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
  adapterType: string;
  requestedByUserId: string;
  errorMessage: string | null;
  summary: string | null;
  heartbeatAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type LiveDashboard = {
  counts: {
    running: number;
    queued: number;
    activeAgents: number;
  };
  runningRuns: RunRecord[];
  queuedRuns: RunRecord[];
  activeAgents: AgentRecord[];
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

export type SkillVersionRecord = {
  id: string;
  skillId: string;
  version: number;
  instructions: string;
  changelog: string | null;
  createdByUserId: string | null;
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
export type ConnectorOauthStatus =
  | "disconnected"
  | "pending"
  | "connected"
  | "error";

export type ConnectorConfig = {
  host?: string;
  path?: string;
  label?: string;
  gatewayUrl?: string;
  oauthScopes?: string;
  authorizePath?: string;
};

export type ConnectorRecord = {
  id: string;
  name: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  config: ConnectorConfig;
  secretRef: string | null;
  oauthStatus: ConnectorOauthStatus;
  oauthClientIdRef: string | null;
  oauthClientSecretRef: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
