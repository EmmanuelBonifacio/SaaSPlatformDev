import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsProjectsPage() {
  return (
    <WorkEntityPanel
      title="Projetos"
      description="Projetos de trabalho do painel de agentes (tabelas nativas do tenant)."
      path="projects"
      extraFields="project"
    />
  );
}
