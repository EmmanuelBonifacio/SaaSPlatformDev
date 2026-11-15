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

export type AgentsAgent = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: AgentStatus;
  adapterType: string;
  assigneeAgentId?: string | null;
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
  memoryContext?: string | null;
  memoryCaptureCreated?: boolean;
};

export type AgentsRun = {
  id: string;
  agentId: string;
  taskId: string | null;
  status: string;
  createdAt: string;
};
