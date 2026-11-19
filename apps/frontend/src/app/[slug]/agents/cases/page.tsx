import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsCasesPage() {
  return (
    <WorkEntityPanel
      title="Casos"
      description="Casos de operador para investigações e workstreams acompanhados (nativo do tenant)."
      path="cases"
      extraFields="case"
    />
  );
}
