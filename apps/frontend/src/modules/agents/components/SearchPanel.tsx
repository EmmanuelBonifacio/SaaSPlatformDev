"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { agentsApiService } from "@/services/agents.service";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

type Hit = {
  id: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  kind?: string | null;
};

type SearchPayload = {
  agents: Hit[];
  tasks: Hit[];
  projects: Hit[];
  goals: Hit[];
  artifacts: Hit[];
};

const empty: SearchPayload = {
  agents: [],
  tasks: [],
  projects: [],
  goals: [],
  artifacts: [],
};

export function SearchPanel() {
  const base = useAgentsBasePath();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPayload>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(empty);
      setError("");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const data = await agentsApiService.search(q, 20);
          if (!active) return;
          setResults({
            agents: data.agents,
            tasks: data.tasks,
            projects: data.projects,
            goals: data.goals,
            artifacts: data.artifacts,
          });
          setError("");
        } catch (reason) {
          if (active) setError(errorMessage(reason));
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();

  return (
    <div>
      <PageHeader
        title="Buscar"
        description="FTS no servidor em agentes, tarefas, projetos, metas e artefatos."
      />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar agentes, tarefas, projetos…"
          className="pl-9"
          autoFocus
          maxLength={100}
        />
      </div>

      {error ? (
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!q ? (
        <p className="text-sm text-muted-foreground">Digite para buscar.</p>
      ) : loading ? (
        <div className="flex min-h-24 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <HitSection
            label="Agentes"
            href={(id) => `${base}/${id}`}
            rows={results.agents}
            statusKind="agent"
          />
          <HitSection
            label="Tarefas"
            href={(id) => `${base}/tasks/${id}`}
            rows={results.tasks}
            statusKind="task"
          />
          <HitSection
            label="Projetos"
            href={() => `${base}/projects`}
            rows={results.projects}
            statusKind="generic"
          />
          <HitSection
            label="Metas"
            href={() => `${base}/goals`}
            rows={results.goals}
            statusKind="generic"
          />
          <HitSection
            label="Artefatos"
            href={() => `${base}/artifacts`}
            rows={results.artifacts}
            statusKind="generic"
            showKind
          />
        </div>
      )}
    </div>
  );
}

function HitSection({
  label,
  rows,
  href,
  statusKind,
  showKind = false,
}: {
  label: string;
  rows: Hit[];
  href: (id: string) => string;
  statusKind: "agent" | "task" | "generic";
  showKind?: boolean;
}) {
  return (
    <section>
      <h2 className="agents-section-label mb-2">
        {label} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum resultado em {label.toLowerCase()}.</p>
      ) : (
        rows.map((row) => (
          <Link key={row.id} href={href(row.id)} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.title}</p>
              {showKind ? (
                <p className="agents-mono">{row.kind || "artifact"}</p>
              ) : row.subtitle ? (
                <p className="truncate text-xs text-muted-foreground">
                  {row.subtitle}
                </p>
              ) : null}
            </div>
            {row.status ? (
              <StatusChip kind={statusKind} status={row.status} />
            ) : null}
          </Link>
        ))
      )}
    </section>
  );
}
