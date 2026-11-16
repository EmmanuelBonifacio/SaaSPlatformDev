"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsRun } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage, statusLabel } from "../lib/agents-ui";

type Props = { runId: string };

export function RunDetailPanel({ runId }: Props) {
  const base = useAgentsBasePath();
  const [run, setRun] = useState<AgentsRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRun(await agentsApiService.getRun(runId));
    } catch (reason) {
      setError(errorMessage(reason));
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!run) {
    return (
      <p className="text-sm text-destructive">{error || "Run não encontrado."}</p>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`${base}/runs`} className="text-sm text-muted-foreground hover:underline">
        ← Runs
      </Link>
      <h2 className="text-lg font-semibold">Run {run.id.slice(0, 8)}</h2>
      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Detalhe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Status" value={statusLabel(run.status)} />
          <Row label="Agent" value={run.agentId} />
          <Row label="Task" value={run.taskId || "—"} />
          <Row label="Erro" value={run.errorMessage || "—"} />
          <Row
            label="Início"
            value={run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
          />
          <Row
            label="Fim"
            value={run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "—"}
          />
          <Row label="Criado" value={new Date(run.createdAt).toLocaleString()} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
