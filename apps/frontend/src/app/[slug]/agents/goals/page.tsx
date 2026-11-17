import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsGoalsPage() {
  return (
    <WorkEntityPanel
      title="Goals"
      description="Goals linked optionally to projects."
      path="goals"
      extraFields="goal"
    />
  );
}
