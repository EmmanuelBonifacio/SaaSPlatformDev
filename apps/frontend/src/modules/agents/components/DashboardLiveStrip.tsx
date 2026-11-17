"use client";

import Link from "next/link";
import type { AgentsLiveDashboard } from "@/types/agents.types";
import { StatusChip } from "./board/StatusChip";

type Props = {
  base: string;
  live: AgentsLiveDashboard | null;
};

export function DashboardLiveStrip({ base, live }: Props) {
  if (!live) return null;
  const { counts, runningRuns, activeAgents } = live;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold tracking-wide">Live</h2>
        <Badge label="running" value={counts.running} hot={counts.running > 0} />
        <Badge label="queued" value={counts.queued} />
        <Badge label="active agents" value={counts.activeAgents} />
        <Link
          href={`${base}/runs`}
          className="ml-auto text-xs text-primary hover:underline"
        >
          All runs
        </Link>
      </div>

      {runningRuns.length === 0 && activeAgents.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No live runs. Queue a run from a task or private thread.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            {runningRuns.slice(0, 5).map((run) => (
              <Link
                key={run.id}
                href={`${base}/runs/${run.id}`}
                className="agents-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    run {run.id.slice(0, 8)}
                    {run.taskId ? ` · task ${run.taskId.slice(0, 8)}` : ""}
                  </p>
                  <p className="agents-mono">
                    hb{" "}
                    {run.heartbeatAt
                      ? new Date(run.heartbeatAt).toLocaleTimeString()
                      : "—"}
                  </p>
                </div>
                <StatusChip kind="generic" status={run.status} />
              </Link>
            ))}
          </div>
          <div className="space-y-2">
            {activeAgents.slice(0, 5).map((agent) => (
              <Link
                key={agent.id}
                href={`${base}/${agent.id}`}
                className="agents-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="agents-mono">
                    {agent.adapterType}
                    {agent.lastHeartbeatAt
                      ? ` · ${new Date(agent.lastHeartbeatAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                </div>
                <StatusChip kind="generic" status={agent.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Badge({
  label,
  value,
  hot = false,
}: {
  label: string;
  value: number;
  hot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${
        hot
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border text-muted-foreground"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          hot ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40"
        }`}
      />
      {value} {label}
    </span>
  );
}
