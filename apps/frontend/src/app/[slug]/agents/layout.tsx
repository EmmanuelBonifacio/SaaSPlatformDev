import { AgentsShell } from "@/modules/agents/components/AgentsShell";

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentsShell>{children}</AgentsShell>;
}
