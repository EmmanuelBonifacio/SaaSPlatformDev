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
        title="Settings"
        description="Tenant agents summary. Auth is SaaS JWT — no Paperclip login."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Memory lives in{" "}
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
            <dt className="text-muted-foreground">Agents</dt>
            <dd className="ml-auto font-medium">{agents.length}</dd>
          </div>
          <div className="agents-row">
            <dt className="text-muted-foreground">Require run approval</dt>
            <dd className="ml-auto font-medium">{requireApproval}</dd>
          </div>
          <p className="pt-2 text-sm text-muted-foreground">
            Per-agent defaults edit on the agent Config tab. Global module flags
            need a dedicated API later.
          </p>
        </dl>
      )}
    </div>
  );
}
