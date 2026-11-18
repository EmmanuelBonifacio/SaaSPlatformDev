import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsCasesPage() {
  return (
    <WorkEntityPanel
      title="Cases"
      description="Operator cases for investigations and tracked workstreams (tenant-native)."
      path="cases"
      extraFields="case"
    />
  );
}
