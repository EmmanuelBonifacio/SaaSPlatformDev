"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsAgent, UpdateAgentInput } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage, statusLabel } from "../lib/agents-ui";
import { AgentForm } from "./AgentForm";

type Props = { agentId: string };

export function AgentDetailPanel({ agentId }: Props) {
  const base = useAgentsBasePath();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [agent, setAgent] = useState<AgentsAgent | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAgent(await agentsApiService.getAgent(agentId));
    } catch (reason) {
      setError(errorMessage(reason));
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(input: UpdateAgentInput) {
    setSaving(true);
    setError("");
    try {
      const updated = await agentsApiService.updateAgent(agentId, input);
      setAgent(updated);
      setEditing(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error || "Agente não encontrado."}</p>
        <Button variant="outline" onClick={() => router.push(`${base}/list`)}>
          Voltar à lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={`${base}/list`} className="text-sm text-muted-foreground hover:underline">
            ← Agentes
          </Link>
          <h2 className="text-lg font-semibold">{agent.name}</h2>
        </div>
        {isAdmin && !editing && (
          <Button size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar agente</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentForm
              mode="edit"
              initial={agent}
              submitting={saving}
              onSubmit={save}
            />
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Detalhe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status" value={statusLabel(agent.status)} />
            <Row label="Role" value={agent.role} />
            <Row label="Título" value={agent.title || "—"} />
            <Row label="Adapter" value={agent.adapterType} />
            <Row
              label="Aprovação de runs"
              value={agent.permissions?.requireRunApproval ? "sim" : "não"}
            />
            <Row label="Capabilities" value={agent.capabilities || "—"} />
            <Row label="Atualizado" value={new Date(agent.updatedAt).toLocaleString()} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap break-words">{value}</span>
    </div>
  );
}
