"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { agentsApiService } from "@/services/agents.service";
import { toAgentsOpError, type AgentsOpError } from "../lib/agents-ui";
import {
  AgentsEmptyState,
  AgentsErrorAlert,
  AgentsLoadingState,
  AgentsSuccessAlert,
} from "./board/AgentsFeedback";
import { PageHeader } from "./board/PageHeader";
import { StatusChip } from "./board/StatusChip";

type WorkRow = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  starred?: boolean;
  scheduleCron?: string | null;
  kind?: string;
  priority?: string;
  workingDirectory?: string | null;
  assigneeAgentId?: string | null;
  lastFiredAt?: string | null;
  lastFireError?: string | null;
  createdAt: string;
};

type Props = {
  title: string;
  description: string;
  path: string;
  adminWrite?: boolean;
  extraFields?:
    | "routine"
    | "artifact"
    | "goal"
    | "project"
    | "case"
    | "workspace";
};

export function WorkEntityPanel({
  title,
  description,
  path,
  adminWrite = true,
  extraFields = "project",
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canWrite = adminWrite ? isAdmin : Boolean(user);
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [schedule, setSchedule] = useState("");
  const [kind, setKind] = useState("note");
  const [priority, setPriority] = useState("medium");
  const [workspaceKind, setWorkspaceKind] = useState("execution");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [assigneeAgentId, setAssigneeAgentId] = useState("");
  const [error, setError] = useState<AgentsOpError | null>(null);
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [wakingId, setWakingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WorkRow[]>(`/agents/${path}`, {
        params: { limit: 50 },
      });
      setRows(response.data);
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || !name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess("");
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: desc.trim() || null,
      };
      if (extraFields === "routine") {
        body.scheduleCron = schedule.trim() || null;
        body.assigneeAgentId = assigneeAgentId.trim() || null;
      }
      if (extraFields === "artifact") body.kind = kind;
      if (extraFields === "project") body.starred = false;
      if (extraFields === "case") body.priority = priority;
      if (extraFields === "workspace") {
        body.kind = workspaceKind;
        body.workingDirectory = workingDirectory.trim() || null;
      }
      await api.post(`/agents/${path}`, body);
      setName("");
      setDesc("");
      setSchedule("");
      setWorkingDirectory("");
      setAssigneeAgentId("");
      setCreating(false);
      setSuccess(
        extraFields === "routine" && body.assigneeAgentId
          ? "Routine saved — cron will wake the assignee on schedule."
          : "Created successfully.",
      );
      await refresh();
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setSaving(false);
    }
  }

  function nextStatus(current: string | undefined): string | null {
    if (extraFields === "case") {
      const order = ["open", "in_progress", "resolved", "closed"];
      const idx = order.indexOf(current || "open");
      return order[(idx + 1) % order.length] ?? null;
    }
    if (extraFields === "workspace") {
      const order = ["active", "paused", "archived"];
      const idx = order.indexOf(current || "active");
      return order[(idx + 1) % order.length] ?? null;
    }
    return null;
  }

  async function advanceStatus(row: WorkRow) {
    const status = nextStatus(row.status);
    if (!status || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/agents/${path}/${row.id}`, { status });
      setSuccess(`Status → ${status}`);
      await refresh();
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function wakeAssignee(row: WorkRow) {
    if (!row.assigneeAgentId || !canWrite) return;
    setWakingId(row.id);
    setError(null);
    setSuccess("");
    try {
      await agentsApiService.createRun(row.assigneeAgentId, {});
      setSuccess(
        `Wake dispatched for agent ${row.assigneeAgentId.slice(0, 8)}…`,
      );
    } catch (reason) {
      setError(toAgentsOpError(reason));
    } finally {
      setWakingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {canWrite ? (
              <Button size="sm" onClick={() => setCreating((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            ) : null}
          </>
        }
      />
      {error ? (
        <AgentsErrorAlert error={error} onDismiss={() => setError(null)} />
      ) : null}
      {success ? (
        <AgentsSuccessAlert
          message={success}
          onDismiss={() => setSuccess("")}
        />
      ) : null}
      {creating && canWrite ? (
        <form
          onSubmit={onCreate}
          className="mb-4 space-y-2 rounded-lg border border-border p-3"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            maxLength={200}
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
          {extraFields === "routine" ? (
            <>
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Cron UTC 5-field e.g. */15 * * * *"
                maxLength={120}
              />
              <Input
                value={assigneeAgentId}
                onChange={(e) => setAssigneeAgentId(e.target.value)}
                placeholder="Assignee agent UUID (optional — wake on fire)"
                maxLength={36}
              />
            </>
          ) : null}
          {extraFields === "artifact" ? (
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              {["note", "file", "link", "plan", "output"].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          ) : null}
          {extraFields === "case" ? (
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : null}
          {extraFields === "workspace" ? (
            <>
              <select
                value={workspaceKind}
                onChange={(e) => setWorkspaceKind(e.target.value)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {["execution", "shared", "personal"].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <Input
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                placeholder="Working directory (optional)"
                maxLength={500}
              />
            </>
          ) : null}
          <Button type="submit" size="sm" disabled={saving || !name.trim()}>
            Create
          </Button>
        </form>
      ) : null}
      {loading ? (
        <AgentsLoadingState label={`Loading ${title.toLowerCase()}…`} />
      ) : rows.length === 0 ? (
        <AgentsEmptyState
          title={`No ${title.toLowerCase()} yet`}
          description={
            canWrite
              ? "Use New to create the first item."
              : "Ask an admin if you need write access."
          }
          action={
            canWrite
              ? { label: "New", onClick: () => setCreating(true) }
              : undefined
          }
        />
      ) : (
        rows.map((row) => (
          <div key={row.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {row.starred ? "★ " : ""}
                {row.name}
              </p>
              <p className="agents-mono">
                {row.scheduleCron
                  ? `cron ${row.scheduleCron}${
                      row.assigneeAgentId
                        ? ` · wake ${row.assigneeAgentId.slice(0, 8)}`
                        : ""
                    }${
                      row.lastFiredAt
                        ? ` · last ${new Date(row.lastFiredAt).toLocaleString()}`
                        : ""
                    }`
                  : row.priority
                    ? `priority ${row.priority}`
                    : row.workingDirectory ||
                      row.kind ||
                      row.description ||
                      "—"}
              </p>
              {row.lastFireError ? (
                <p className="mt-1 text-xs text-destructive">
                  Last wake error: {row.lastFireError}
                </p>
              ) : null}
            </div>
            {row.status ? (
              <StatusChip kind="generic" status={row.status} />
            ) : null}
            {canWrite && extraFields === "routine" && row.assigneeAgentId ? (
              <Button
                size="sm"
                variant="outline"
                disabled={wakingId === row.id || saving}
                onClick={() => void wakeAssignee(row)}
              >
                <Zap className="mr-1 h-3.5 w-3.5" />
                {wakingId === row.id ? "Waking…" : "Wake now"}
              </Button>
            ) : null}
            {canWrite && nextStatus(row.status) ? (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void advanceStatus(row)}
              >
                Advance
              </Button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
