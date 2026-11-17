"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsAgent, AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

export function SearchPanel() {
  const base = useAgentsBasePath();
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [agentRows, taskRows] = await Promise.all([
        agentsApiService.listAgents(),
        agentsApiService.listTasks(),
      ]);
      setAgents(agentRows);
      setTasks(taskRows);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const q = query.trim().toLowerCase();
  const matchedAgents = q
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.title ?? "").toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      )
    : [];
  const matchedTasks = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      )
    : [];

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find agents and tasks in this tenant."
      />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents and tasks…"
          className="pl-9"
          autoFocus
        />
      </div>

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-24 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !q ? (
        <p className="text-sm text-muted-foreground">Type to search.</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="agents-section-label mb-2">
              Agents ({matchedAgents.length})
            </h2>
            {matchedAgents.map((agent) => (
              <Link
                key={agent.id}
                href={`${base}/${agent.id}`}
                className="agents-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.title || agent.role}
                  </p>
                </div>
                <StatusChip kind="agent" status={agent.status} />
              </Link>
            ))}
            {matchedAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents matched.</p>
            ) : null}
          </section>
          <section>
            <h2 className="agents-section-label mb-2">
              Tasks ({matchedTasks.length})
            </h2>
            {matchedTasks.map((task) => (
              <Link
                key={task.id}
                href={`${base}/tasks/${task.id}`}
                className="agents-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                </div>
                <StatusChip kind="task" status={task.status} />
              </Link>
            ))}
            {matchedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks matched.</p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
