import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsArtifactsPage() {
  return (
    <WorkEntityPanel
      title="Artifacts"
      description="Notes, plans, links, and outputs. Cases/Workspaces deferred."
      path="artifacts"
      adminWrite={false}
      extraFields="artifact"
    />
  );
}