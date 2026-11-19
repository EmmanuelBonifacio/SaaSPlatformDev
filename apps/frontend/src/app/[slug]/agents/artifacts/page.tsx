import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsArtifactsPage() {
  return (
    <WorkEntityPanel
      title="Artefatos"
      description="Notas, planos, links e saídas. Cases/Workspaces adiados."
      path="artifacts"
      adminWrite={false}
      extraFields="artifact"
    />
  );
}
