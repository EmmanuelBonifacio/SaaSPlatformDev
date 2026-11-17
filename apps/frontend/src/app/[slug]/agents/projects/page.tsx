import { WorkEntityPanel } from "@/modules/agents/components/WorkEntityPanel";

export default function AgentsProjectsPage() {
  return (
    <WorkEntityPanel
      title="Projects"
      description="Work projects for the agents board (native tenant tables)."
      path="projects"
      extraFields="project"
    />
  );
}
