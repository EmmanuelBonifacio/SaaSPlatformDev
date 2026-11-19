"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsSecretRef } from "@/types/agents.types";
import { errorMessage } from "../../lib/agents-ui";
import { AgentSecretRow } from "./AgentSecretRow";

type Props = { agentId: string; canEdit: boolean };

export function AgentSecretsPanel({ agentId, canEdit }: Props) {
  const [rows, setRows] = useState<AgentsSecretRef[]>([]);
  const [name, setName] = useState("");
  const [envRef, setEnvRef] = useState("");
  const [value, setValue] = useState("");
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");
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
    if (!canEdit || !value.trim()) return;
    setSaving(true);
    setError("");
    try {
      await agentsApiService.createSecretRef(agentId, {
        name: name.trim(),
        envRef: envRef.trim().toUpperCase(),
        value: value.trim(),
      });
      setName("");
      setEnvRef("");
      setValue("");
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function onRotate(secretId: string) {
    if (!canEdit || !rotateValue.trim()) return;
    setSaving(true);
    setError("");
    try {
      await agentsApiService.rotateSecretValue(
        agentId,
        secretId,
        rotateValue.trim(),
      );
      setRotatingId(null);
      setRotateValue("");
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
      if (rotatingId === secretId) {
        setRotatingId(null);
        setRotateValue("");
      }
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
        Cole o valor uma vez (definir/rotacionar). Fica criptografado no servidor;
        a UI nunca mostra o plaintext depois de salvar. Em dev local, o runner
        ainda pode cair para{" "}
        <span className="agents-mono">process.env</span> se não houver valor
        configurado.
      </p>
      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <AgentSecretRow
            key={row.id}
            row={row}
            canEdit={canEdit}
            saving={saving}
            rotating={rotatingId === row.id}
            rotateValue={rotateValue}
            onRotateValueChange={setRotateValue}
            onToggleRotate={() => {
              setRotatingId(rotatingId === row.id ? null : row.id);
              setRotateValue("");
            }}
            onSaveRotate={() => void onRotate(row.id)}
            onDelete={() => void onDelete(row.id)}
          />
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            Nenhum segredo configurado ainda.
          </li>
        ) : null}
      </ul>
      {canEdit ? (
        <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Rótulo (ex.: Anthropic)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
          <Input
            placeholder="ENV_NAME (ex.: ANTHROPIC_API_KEY)"
            value={envRef}
            onChange={(e) => setEnvRef(e.target.value.toUpperCase())}
            required
            pattern="^[A-Z][A-Z0-9_]*$"
            maxLength={128}
          />
          <Input
            className="sm:col-span-2"
            type="password"
            autoComplete="new-password"
            placeholder="Valor do segredo (colado uma vez)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={8192}
          />
          <Button
            type="submit"
            className="sm:col-span-2"
            disabled={
              saving || !name.trim() || !envRef.trim() || !value.trim()
            }
          >
            Adicionar e criptografar
          </Button>
        </form>
      ) : null}
    </div>
  );
}
