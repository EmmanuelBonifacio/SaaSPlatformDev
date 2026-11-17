"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { agentsApiService } from "@/services/agents.service";
import api from "@/services/api";
import type { AgentsAgent, AgentsTask } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

type NamedRow = {
  id: string;
  name: string;
  description?: string | null;
  kind?: string;
  status?: string;
};

export function SearchPanel() {
  const base = useAgentsBasePath();
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<AgentsAgent[]>([]);
  const [tasks, setTasks] = useState<AgentsTask[]>([]);
  const [projects, setProjects] = useState<NamedRow[]>([]);
  const [artifacts, setArtifacts] = useState<NamedRow[]>([]);
  const [goals, setGoals] = useState<NamedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [agentRows, taskRows, projectRows, artifactRows, goalRows] =
        await Promise.all([
          agentsApiService.listAgents(),
          agentsApiService.listTasks(),
          api.get<NamedRow[]>("/agents/projects", { params: { limit: 100 } }),
          api.get<NamedRow[]>("/agents/artifacts", { params: { limit: 100 } }),
          api.get<NamedRow[]>("/agents/goals", { params: { limit: 100 } }),
        ]);
      setAgents(agentRows);
      setTasks(taskRows);
      setProjects(projectRows.data);
      setArtifacts(artifactRows.data);
      setGoals(goalRows.data);
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

  const matched = useMemo(() => {
    if (!q) {
      return {
        agents: [] as AgentsAgent[],
        tasks: [] as AgentsTask[],
        projects: [] as NamedRow[],
        artifacts: [] as NamedRow[],
        goals: [] as NamedRow[],
      };
    }
    return {
      agents: agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.title ?? "").toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      ),
      tasks: tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      ),
      projects: projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      ),
      artifacts: artifacts.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.kind ?? "").toLowerCase().includes(q),
      ),
      goals: goals.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description ?? "").toLowerCase().includes(q),
      ),
    };
  }, [q, agents, tasks, projects, artifacts, goals]);

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find agents, tasks, projects, goals, and artifacts in this tenant."
      />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents, tasks, projects…"
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
              Agents ({matched.agents.length})
            </h2>
            {matched.agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents matched.</p>
            ) : (
              matched.agents.map((agent) => (
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
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">
              Tasks ({matched.tasks.length})
            </h2>
            {matched.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks matched.</p>
            ) : (
              matched.tasks.map((task) => (
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
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">
              Projects ({matched.projects.length})
            </h2>
            {matched.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects matched.
              </p>
            ) : (
              matched.projects.map((row) => (
                <Link
                  key={row.id}
                  href={`${base}/projects`}
                  className="agents-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                  </div>
                  {row.status ? (
                    <StatusChip kind="generic" status={row.status} />
                  ) : null}
                </Link>
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">
              Goals ({matched.goals.length})
            </h2>
            {matched.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals matched.</p>
            ) : (
              matched.goals.map((row) => (
                <Link key={row.id} href={`${base}/goals`} className="agents-row">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                  </div>
                  {row.status ? (
                    <StatusChip kind="generic" status={row.status} />
                  ) : null}
                </Link>
              ))
            )}
          </section>

          <section>
            <h2 className="agents-section-label mb-2">
              Artifacts ({matched.artifacts.length})
            </h2>
            {matched.artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No artifacts matched.
              </p>
            ) : (
              matched.artifacts.map((row) => (
                <Link
                  key={row.id}
                  href={`${base}/artifacts`}
                  className="agents-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="agents-mono">{row.kind || "artifact"}</p>
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
