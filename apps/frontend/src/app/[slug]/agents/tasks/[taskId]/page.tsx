import { TaskDetailPanel } from "@/modules/agents/components/TaskDetailPanel";

type Props = { params: Promise<{ taskId: string }> };

export default async function AgentTaskDetailPage({ params }: Props) {
  const { taskId } = await params;
  return <TaskDetailPanel taskId={taskId} />;
}
