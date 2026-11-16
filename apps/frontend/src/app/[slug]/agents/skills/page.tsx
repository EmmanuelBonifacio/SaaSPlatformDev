import { GovernancePlaceholder } from "@/modules/agents/components/GovernancePlaceholder";

export default function AgentsSkillsPage() {
  return (
    <GovernancePlaceholder
      title="Skills"
      summary="Catálogo / skill studio do Paperclip não tem endpoints nativos em /agents V1. Use configurações por agente (capabilities) enquanto a API de skills não existir."
    />
  );
}
