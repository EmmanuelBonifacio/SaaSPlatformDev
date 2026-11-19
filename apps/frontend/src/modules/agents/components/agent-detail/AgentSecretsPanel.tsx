"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsSecretRef } from "@/types/agents.types";
import { errorMessage } from "../../lib/agents-ui";

type Props = { agentId: string; canEdit: boolean };

export function AgentSecretsPanel({ agentId, canEdit }: Props) {
  const [rows, setRows] = useState<AgentsSecretRef[]>([]);
  const [name, setName] = useState("");
  const [envRef, setEnvRef] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await agentsApiService.listSecretRefs(agentId));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      await agentsApiService.createSecretRef(agentId, {
        name: name.trim(),
        envRef: envRef.trim().toUpperCase(),
      });
      setName("");
      setEnvRef("");
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(secretId: string) {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      await agentsApiService.deleteSecretRef(agentId, secretId);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Armazene apenas nomes de variáveis de ambiente — nunca cole valores secretos.
      </p>
      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="agents-row">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{row.name}</p>
              <p className="agents-mono">{row.envRef}</p>
            </div>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void onDelete(row.id)}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhuma ref de segredo ainda.</li>
        ) : null}
      </ul>
      {canEdit ? (
        <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="Rótulo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
          <Input
            placeholder="ENV_NAME"
            value={envRef}
            onChange={(e) => setEnvRef(e.target.value.toUpperCase())}
            required
            pattern="^[A-Z][A-Z0-9_]*$"
            maxLength={128}
          />
          <Button type="submit" disabled={saving || !name.trim() || !envRef.trim()}>
            Adicionar ref
          </Button>
        </form>
      ) : null}
    </div>
  );
}
