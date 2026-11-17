export type ProjectStatus = "active" | "paused" | "archived";
export type RoutineStatus = "active" | "paused" | "archived";
export type GoalStatus = "open" | "in_progress" | "done" | "cancelled";
export type ArtifactKind = "note" | "file" | "link" | "plan" | "output";

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  starred: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoutineRecord = {
  id: string;
  name: string;
  description: string | null;
  scheduleCron: string | null;
  status: RoutineStatus;
  projectId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalRecord = {
  id: string;
  name: string;
  description: string | null;
  status: GoalStatus;
  projectId: string | null;
  targetDate: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ArtifactRecord = {
  id: string;
  name: string;
  kind: ArtifactKind;
  content: string | null;
  uri: string | null;
  taskId: string | null;
  projectId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
