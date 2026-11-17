"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentsApiService } from "@/services/agents.service";
import type { ConnectorKind } from "@/types/agents.types";
import {
  CONNECTOR_KIND_HINTS,
  CONNECTOR_KINDS,
} from "../lib/connectors";
import { errorMessage } from "../lib/agents-ui";

type Props = {
  onCreated: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

export function ConnectorCreateForm({ onCreated, onCancel, onError }: Props) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ConnectorKind>("webhook");
  const [host, setHost] = useState("");
  const [path, setPath] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [saving, setSaving] = useState(false);

  function onKindChange(next: ConnectorKind) {
    setKind(next);
    const hint = CONNECTOR_KIND_HINTS[next].hostHint;
    if (hint && !host) setHost(hint);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await agentsApiService.createConnector({
        name: name.trim(),
        kind,
        config: {
          host: host.trim() || undefined,
          path: path.trim() || undefined,
        },
        secretRef: secretRef.trim() || null,
        status: "disabled",
      });
      onCreated();
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 space-y-3 rounded-lg border border-border p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="conn-name">Name</Label>
          <Input
            id="conn-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="conn-kind">Kind</Label>
          <select
            id="conn-kind"
            value={kind}
            onChange={(e) => onKindChange(e.target.value as ConnectorKind)}
            className="w-full rounded-md border bg-background p-2 text-sm"
          >
            {CONNECTOR_KINDS.map((value) => (
              <option key={value} value={value}>
                {CONNECTOR_KIND_HINTS[value].label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="conn-host">Host (non-secret)</Label>
          <Input
            id="conn-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            maxLength={500}
            placeholder={CONNECTOR_KIND_HINTS[kind].hostHint}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="conn-path">Path</Label>
          <Input
            id="conn-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="conn-secret-ref">Secret ref (env name only)</Label>
        <Input
          id="conn-secret-ref"
          value={secretRef}
          onChange={(e) => setSecretRef(e.target.value.toUpperCase())}
          maxLength={128}
          placeholder="TRACCAR_PASSWORD"
          pattern="^[A-Z][A-Z0-9_]*$"
        />
        <p className="text-xs text-muted-foreground">
          Never paste passwords/tokens here — only the env variable name.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          Create
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
