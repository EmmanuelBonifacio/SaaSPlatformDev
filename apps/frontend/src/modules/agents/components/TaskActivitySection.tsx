"use client";

import { useCallback, useEffect, useState } from "react";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsActivity } from "@/types/agents.types";
import { errorMessage, statusLabel } from "../lib/agents-ui";

type Props = {
  taskId: string;
  refreshKey: number;
  onError: (message: string) => void;
};

export function TaskActivitySection({ taskId, refreshKey, onError }: Props) {
  const [rows, setRows] = useState<AgentsActivity[]>([]);

  const load = useCallback(async () => {
    try {
      setRows(
        await agentsApiService.listActivity({
          entityType: "task",
          entityId: taskId,
          limit: 25,
        }),
      );
    } catch (reason) {
      onError(errorMessage(reason));
    }
  }, [taskId, onError]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="space-y-2">
      <p className="agents-section-label">Atividade</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade registrada nesta tarefa ainda.
        </p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {statusLabel(row.action)}
              </p>
              <p className="agents-mono">
                {row.actorType}:{row.actorId.slice(0, 8)} ·{" "}
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
