import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsRoutinesPage() {
  return (
    <WorkEntityPanel
      title="Routines"
      description="UTC cron (5-field). Active routines create a task each match; assignee wakes a run."
      path="routines"
      extraFields="routine"
    />
  );
}
