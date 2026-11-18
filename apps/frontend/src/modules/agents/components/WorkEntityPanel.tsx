"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import { errorMessage } from "../lib/agents-ui";
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<WorkRow[]>(`/agents/${path}`, {
        params: { limit: 50 },
      });
      setRows(response.data);
    } catch (reason) {
      setError(errorMessage(reason));
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
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: desc.trim() || null,
      };
      if (extraFields === "routine") body.scheduleCron = schedule.trim() || null;
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
      setCreating(false);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
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
    setError("");
    try {
      await api.patch(`/agents/${path}/${row.id}`, { status });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
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
        <div role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </div>
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
            <Input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="Cron (optional) e.g. 0 9 * * 1-5"
              maxLength={120}
            />
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
        <div className="flex min-h-32 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {row.starred ? "★ " : ""}
                {row.name}
              </p>
              <p className="agents-mono">
                {row.priority
                  ? `priority ${row.priority}`
                  : row.workingDirectory ||
                    row.kind ||
                    row.scheduleCron ||
                    row.description ||
                    "—"}
              </p>
            </div>
            {row.status ? (
              <StatusChip kind="generic" status={row.status} />
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
