import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsGoalsPage() {
  return (
    <WorkEntityPanel
      title="Metas"
      description="Metas vinculadas opcionalmente a projetos."
      path="goals"
      extraFields="goal"
    />
  );
}
