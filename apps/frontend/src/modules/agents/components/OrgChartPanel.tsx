"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

type OrgNode = AgentsAgent & { children: OrgNode[] };

type OrgResponse = {
  agents: OrgNode[];
  flat: AgentsAgent[];
};

function OrgBranch({
  node,
  base,
  depth,
  flat,
  canEdit,
  onReparent,
}: {
  node: OrgNode;
  base: string;
  depth: number;
  flat: AgentsAgent[];
  canEdit: boolean;
  onReparent: (agentId: string, reportsTo: string | null) => Promise<void>;
}) {
  return (
    <div className={depth === 0 ? "" : "ml-4 border-l border-border pl-3"}>
      <div className="agents-row">
        <div className="min-w-0 flex-1">
          <Link
            href={`${base}/${node.id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {node.name}
          </Link>
          <p className="agents-mono">
            {node.title || node.role}
            {node.reportsToAgentId
              ? ` · reporta a ${
                  flat.find((a) => a.id === node.reportsToAgentId)?.name ?? "…"
                }`
              : " · raiz"}
          </p>
        </div>
        <StatusChip kind="agent" status={node.status} />
        {canEdit ? (
          <select
            className="max-w-[10rem] rounded-md border bg-background p-1 text-xs"
            value={node.reportsToAgentId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              void onReparent(node.id, value === "" ? null : value);
            }}
            aria-label={`Reporta a — ${node.name}`}
          >
            <option value="">— raiz —</option>
            {flat
              .filter((a) => a.id !== node.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        ) : null}
      </div>
      {node.children.map((child) => (
        <OrgBranch
          key={child.id}
          node={child}
          base={base}
          depth={depth + 1}
          flat={flat}
          canEdit={canEdit}
          onReparent={onReparent}
        />
      ))}
    </div>
  );
}

export function OrgChartPanel() {
  const base = useAgentsBasePath();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "superadmin";
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [flat, setFlat] = useState<AgentsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<OrgResponse>("/agents/org");
      setTree(response.data.agents);
      setFlat(response.data.flat);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onReparent(agentId: string, reportsTo: string | null) {
    setError("");
    try {
      await agentsApiService.updateAgent(agentId, {
        reportsToAgentId: reportsTo,
      });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  return (
    <div>
      <PageHeader
        title="Organograma"
        description="Linhas de reporte dos agentes neste tenant. Fluxos de hire/join ficam fora do escopo."
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
      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum agente ainda.</p>
      ) : (
        tree.map((node) => (
          <OrgBranch
            key={node.id}
            node={node}
            base={base}
            depth={0}
            flat={flat}
            canEdit={canEdit}
            onReparent={onReparent}
          />
        ))
      )}
    </div>
  );
}
