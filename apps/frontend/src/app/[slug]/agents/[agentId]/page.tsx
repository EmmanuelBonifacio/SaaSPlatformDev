import { AgentDetailPanel } from "@/modules/agents/components/AgentDetailPanel";

type Props = { params: Promise<{ agentId: string }> };

export default async function AgentDetailPage({ params }: Props) {
  const { agentId } = await params;
  return <AgentDetailPanel agentId={agentId} />;
}
