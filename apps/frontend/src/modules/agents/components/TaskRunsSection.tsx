"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsRun } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { StatusChip } from "./board/StatusChip";

type Props = {
  taskId: string;
  refreshKey: number;
  onError: (message: string) => void;
};

export function TaskRunsSection({ taskId, refreshKey, onError }: Props) {
  const base = useAgentsBasePath();
  const [runs, setRuns] = useState<AgentsRun[]>([]);

  const load = useCallback(async () => {
    try {
      setRuns(await agentsApiService.listRuns({ taskId, limit: 20 }));
    } catch (reason) {
      onError(errorMessage(reason));
    }
  }, [taskId, onError]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="space-y-2">
      <p className="agents-section-label">Execuções</p>
      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma execução nesta tarefa.</p>
      ) : (
        runs.map((run) => (
          <Link
            key={run.id}
            href={`${base}/runs/${run.id}`}
            className="agents-row"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                agente {run.agentId.slice(0, 8)}
              </p>
              <p className="agents-mono">
                {new Date(run.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusChip kind="generic" status={run.status} />
          </Link>
        ))
      )}
    </section>
  );
}
