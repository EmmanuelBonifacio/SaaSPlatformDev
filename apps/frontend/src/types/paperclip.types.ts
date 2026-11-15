export interface PaperclipAgent {
  id: string;
  name: string;
  role: string | null;
  title: string | null;
  status: string;
}

export interface PaperclipTask {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string | null;
  assigneeAgentId: string | null;
  updatedAt: string | null;
}

export interface PaperclipConversation {
  id: string;
  agentId: string;
  title: string;
  state: string;
  createdAt: string;
  memoryContext?: string | null;
  memoryCaptureCreated?: boolean;
}

export interface PaperclipMessage {
  id: string;
  body: string;
  author: "user" | "agent" | "system";
  createdAt: string;
  memoryContext?: string | null;
  memoryCaptureCreated?: boolean;
}
