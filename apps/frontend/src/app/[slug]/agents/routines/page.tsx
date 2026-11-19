import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsRoutinesPage() {
  return (
    <WorkEntityPanel
      title="Rotinas"
      description="Cron UTC (5 campos). Rotinas ativas criam uma tarefa a cada match; o responsável acorda uma execução."
      path="routines"
      extraFields="routine"
    />
  );
}
