"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent } from "@/types/agents.types";
import { useAuth } from "@/hooks/useAuth";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { toAgentsOpError, type AgentsOpError } from "../lib/agents-ui";
import {
  AgentsEmptyState,
  AgentsErrorAlert,
  AgentsLoadingState,
} from "./board/AgentsFeedback";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function AgentListPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AgentsOpError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgents(await agentsApiService.listAgents());
    } catch (reason) {
      setError(toAgentsOpError(reason));
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
        title="Agentes"
        description="Agentes da empresa — criar, pausar e abrir detalhes."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            {isAdmin ? (
              <Button size="sm" asChild>
                <Link href={`${base}/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo agente
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <AgentsErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}

      {loading ? (
        <AgentsLoadingState label="Carregando agentes…" />
      ) : agents.length === 0 ? (
        <AgentsEmptyState
          title="Nenhum agente neste tenant"
          description={
            isAdmin
              ? "Crie o primeiro agente para começar a despachar trabalho."
              : "Peça a um admin para criar um agente."
          }
          action={
            isAdmin
              ? { label: "Novo agente", href: `${base}/new` }
              : undefined
          }
        />
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
