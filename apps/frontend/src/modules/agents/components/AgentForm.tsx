"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AgentsAgent,
  CreateAgentInput,
  UpdateAgentInput,
} from "@/types/agents.types";
import { AGENT_STATUSES } from "../lib/agents-ui";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: AgentsAgent;
  submitting?: boolean;
  onSubmit: (input: CreateAgentInput & UpdateAgentInput) => Promise<void>;
};

export function AgentForm({ mode, initial, submitting, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "general");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [adapterType, setAdapterType] = useState(
    initial?.adapterType ?? "stub",
  );
  const [capabilities, setCapabilities] = useState(
    initial?.capabilities ?? "",
  );
  const [status, setStatus] = useState(initial?.status ?? "idle");
  const [requireApproval, setRequireApproval] = useState(
    Boolean(initial?.permissions?.requireRunApproval),
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: CreateAgentInput & UpdateAgentInput = {
      name: name.trim(),
      role: role.trim() || "general",
      title: title.trim() || null,
      adapterType: adapterType.trim() || "stub",
      capabilities: capabilities.trim() || null,
      permissions: { requireRunApproval: requireApproval },
    };
    if (mode === "edit") payload.status = status;
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <Field label="Nome">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={160}
        />
      </Field>
      <Field label="Role">
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          maxLength={64}
        />
      </Field>
      <Field label="Título">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
        />
      </Field>
      <Field label="Adapter">
        <Input
          value={adapterType}
          onChange={(e) => setAdapterType(e.target.value)}
          maxLength={64}
        />
      </Field>
      <Field label="Capabilities">
        <textarea
          value={capabilities}
          onChange={(e) => setCapabilities(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border bg-background p-2 text-sm"
        />
      </Field>
      {mode === "edit" && (
        <Field label="Status">
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as AgentsAgent["status"])
            }
            className="w-full rounded-md border bg-background p-2 text-sm"
          >
            {AGENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(e) => setRequireApproval(e.target.checked)}
        />
        Exigir aprovação de runs
      </label>
      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting
          ? "Salvando..."
          : mode === "create"
            ? "Criar agente"
            : "Salvar alterações"}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
