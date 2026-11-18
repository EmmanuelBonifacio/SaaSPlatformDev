import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsWorkspacesPage() {
  return (
    <WorkEntityPanel
      title="Workspaces"
      description="Execution and shared workspaces for agents (tenant-native, parity-lite)."
      path="workspaces"
      extraFields="workspace"
    />
  );
}
