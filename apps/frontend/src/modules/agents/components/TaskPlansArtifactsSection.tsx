"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/services/api";
import { errorMessage } from "../lib/agents-ui";
import { StatusChip } from "./board/StatusChip";

type Artifact = {
  id: string;
  name: string;
  kind: string;
  content: string | null;
  uri: string | null;
  taskId: string | null;
  createdAt: string;
};

type Props = {
  taskId: string;
  refreshKey?: number;
  onError?: (message: string) => void;
};

export function TaskPlansArtifactsSection({
  taskId,
  refreshKey = 0,
  onError,
}: Props) {
  const [rows, setRows] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"plan" | "note" | "link" | "output">("plan");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Artifact[]>("/agents/artifacts", {
        params: { taskId, limit: 50 },
      });
      setRows(response.data);
    } catch (reason) {
      onError?.(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [taskId, onError]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/agents/artifacts", {
        name: name.trim(),
        kind,
        content: content.trim() || null,
        taskId,
      });
      setName("");
      setContent("");
      setCreating(false);
      await load();
    } catch (reason) {
      onError?.(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  const plans = rows.filter((r) => r.kind === "plan");
  const artifacts = rows.filter((r) => r.kind !== "plan");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="agents-section-label">Plans & artifacts</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setCreating((v) => !v)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {creating ? (
        <form
          onSubmit={onCreate}
          className="space-y-2 rounded-lg border border-border p-3"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Title"
            required
            maxLength={200}
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="w-full rounded-md border bg-background p-2 text-sm"
          >
            <option value="plan">plan</option>
            <option value="note">note</option>
            <option value="link">link</option>
            <option value="output">output</option>
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content (optional)"
            rows={3}
            className="w-full rounded-md border bg-background p-2 text-sm"
          />
          <Button type="submit" size="sm" disabled={saving || !name.trim()}>
            Save
          </Button>
        </form>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <ArtifactColumn title="Plans" rows={plans} empty="No plans yet." />
          <ArtifactColumn
            title="Artifacts"
            rows={artifacts}
            empty="No artifacts yet."
          />
        </div>
      )}
    </section>
  );
}

function ArtifactColumn({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Artifact[];
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-3">
      <p className="agents-section-label mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="mb-2 last:mb-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{row.name}</p>
              <StatusChip kind="generic" status={row.kind} />
            </div>
            {row.content ? (
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                {row.content}
              </p>
            ) : null}
            {row.uri ? (
              <p className="agents-mono mt-1 truncate">{row.uri}</p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
