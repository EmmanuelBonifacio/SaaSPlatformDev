import { RunDetailPanel } from "@/modules/agents/components/RunDetailPanel";

type Props = { params: Promise<{ runId: string }> };

export default async function AgentRunDetailPage({ params }: Props) {
  const { runId } = await params;
  return <RunDetailPanel runId={runId} />;
}
