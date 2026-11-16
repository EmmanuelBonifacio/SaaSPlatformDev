import { GovernancePlaceholder } from "@/modules/agents/components/GovernancePlaceholder";

export default function AgentsOrgPage() {
  return (
    <GovernancePlaceholder
      title="Org"
      summary="Org chart / reporting lines do Paperclip não existem no schema agents V1. Hierarquia de agentes fica para uma fase de DDL dedicada."
    />
  );
}
