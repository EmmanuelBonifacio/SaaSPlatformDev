import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsWorkspacesPage() {
  return (
    <WorkEntityPanel
      title="Espaços de trabalho"
      description="Espaços de execução e compartilhados para agentes (nativo do tenant, parity-lite)."
      path="workspaces"
      extraFields="workspace"
    />
  );
}
