"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent } from "@/types/agents.types";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";

/**
 * Company settings (read-only summary from V1). SaaS JWT auth — no Paperclip login.
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
    <div>
      <PageHeader
        title="Configurações"
        description="Resumo dos agentes do tenant. Auth é JWT SaaS — sem login Paperclip."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">
        A memória fica em{" "}
        <Link
          href={`/${slug ?? ""}/memoria`}
          className="text-primary hover:underline"
        >
          /memoria
        </Link>
        .
      </p>

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="agents-row">
            <dt className="text-muted-foreground">Agentes</dt>
            <dd className="ml-auto font-medium">{agents.length}</dd>
          </div>
          <div className="agents-row">
            <dt className="text-muted-foreground">Exigir aprovação de execução</dt>
            <dd className="ml-auto font-medium">{requireApproval}</dd>
          </div>
          <p className="pt-2 text-sm text-muted-foreground">
            Defaults por agente se editam na aba Config do agente. Flags globais do módulo
            precisam de uma API dedicada depois.
          </p>
        </dl>
      )}
    </div>
  );
}
