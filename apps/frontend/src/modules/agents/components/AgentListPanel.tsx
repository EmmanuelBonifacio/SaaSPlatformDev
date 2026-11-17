"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent } from "@/types/agents.types";
import { useAuth } from "@/hooks/useAuth";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function AgentListPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAgents(await agentsApiService.listAgents());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Company agents — create, pause, and open detail."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" asChild>
                <Link href={`${base}/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  New agent
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No agents in this tenant.
          {isAdmin ? " Use “New agent” to create one." : " Ask an admin."}
        </p>
      ) : (
        agents.map((agent) => (
          <Link key={agent.id} href={`${base}/${agent.id}`} className="agents-row">
            <div
              className="h-8 w-8 shrink-0 rounded-full"
              style={{
                background: `linear-gradient(160deg, var(--agent-${(agent.name.length % 10) + 1}a), var(--agent-${(agent.name.length % 10) + 1}b))`,
              }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{agent.name}</p>
              <p className="text-xs text-muted-foreground">
                {agent.title || agent.role} · {agent.adapterType}
              </p>
            </div>
            <StatusChip kind="agent" status={agent.status} />
          </Link>
        ))
      )}
    </div>
  );
}
