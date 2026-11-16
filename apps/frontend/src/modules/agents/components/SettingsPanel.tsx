"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent } from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";

/**
 * Settings do módulo agents: resumo read-only a partir da API V1.
 * Sem persistência de flags de tenant (ainda não existe endpoint dedicado).
 */
export function SettingsPanel() {
  const params = useParams<{ slug: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
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

  const requireApproval = agents.filter(
    (agent) => agent.permissions?.requireRunApproval,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Settings</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Auth do tenant SaaS (JWT + módulo <code>agents</code>). Sem login
        Paperclip. Memória fica em{" "}
        <Link
          href={`/${slug ?? ""}/memoria`}
          className="text-primary hover:underline"
        >
          /memoria
        </Link>
        .
      </p>

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
            <CardTitle>Resumo do tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Agentes: {agents.length}</p>
            <p>Com aprovação de runs: {requireApproval}</p>
            <p className="text-muted-foreground">
              Defaults por agente são editáveis na página do agente. Flags
              globais de módulo ainda não têm API nativa.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
