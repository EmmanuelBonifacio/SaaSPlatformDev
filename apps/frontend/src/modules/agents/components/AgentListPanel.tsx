"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent } from "@/types/agents.types";
import { useAuth } from "@/hooks/useAuth";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage, statusLabel } from "../lib/agents-ui";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Agentes</h2>
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
          {isAdmin && (
            <Button size="sm" asChild>
              <Link href={`${base}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Novo agente
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista ({agents.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`${base}/${agent.id}`}
                className="rounded-lg border border-border p-3 hover:border-primary"
              >
                <span className="font-medium">{agent.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {agent.title || agent.role} · {statusLabel(agent.status)} ·{" "}
                  {agent.adapterType}
                </span>
              </Link>
            ))}
            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum agente neste tenant.
                {isAdmin
                  ? " Use “Novo agente” para criar."
                  : " Peça a um admin para criar."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
