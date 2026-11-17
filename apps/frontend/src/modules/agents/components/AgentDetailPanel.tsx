"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { AgentsAgent, UpdateAgentInput } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import { errorMessage } from "../lib/agents-ui";
import { AgentForm } from "./AgentForm";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

type Props = { agentId: string };
type Tab = "overview" | "config" | "audit";

export function AgentDetailPanel({ agentId }: Props) {
  const base = useAgentsBasePath();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [agent, setAgent] = useState<AgentsAgent | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
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
      setAgent(await agentsApiService.updateAgent(agentId, input));
      setTab("overview");
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
        <p className="text-sm text-destructive">
          {error || "Agent not found."}
        </p>
        <Button variant="outline" onClick={() => router.push(`${base}/list`)}>
          Back to agents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={agent.name}
        description={agent.title || agent.role}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip kind="agent" status={agent.status} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/list`}>All agents</Link>
            </Button>
          </div>
        }
      />

      <div className="flex gap-1 border-b border-border">
        {(
          [
            ["overview", "Overview"],
            ["config", "Config"],
            ["audit", "Audit"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {tab === "overview" ? (
        <dl className="space-y-2 text-sm">
          <Row label="Status" value={<StatusChip kind="agent" status={agent.status} />} />
          <Row label="Role" value={agent.role} />
          <Row label="Title" value={agent.title || "—"} />
          <Row label="Adapter" value={agent.adapterType} />
          <Row
            label="Run approval"
            value={agent.permissions?.requireRunApproval ? "required" : "off"}
          />
          <Row label="Capabilities" value={agent.capabilities || "—"} />
          <Row
            label="Updated"
            value={new Date(agent.updatedAt).toLocaleString()}
          />
        </dl>
      ) : null}

      {tab === "config" ? (
        isAdmin ? (
          <AgentForm
            mode="edit"
            initial={agent}
            submitting={saving}
            onSubmit={save}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Config edits require admin.
          </p>
        )
      ) : null}

      {tab === "audit" ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Open company Activity / Runs filtered by this agent for the V1 audit
            trail. Harness secrets, tools, and budgets tabs arrive with later
            API coverage.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`${base}/activity`}>Activity</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`${base}/runs`}>Runs</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}
