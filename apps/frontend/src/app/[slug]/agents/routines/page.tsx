import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsRoutinesPage() {
  return (
    <WorkEntityPanel
      title="Routines"
      description="Scheduled routines. Cron is stored; dispatcher depth is honest-limited."
      path="routines"
      extraFields="routine"
    />
  );
}
