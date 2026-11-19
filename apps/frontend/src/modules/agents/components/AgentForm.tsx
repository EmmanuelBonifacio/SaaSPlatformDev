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
import {
  AGENT_ADAPTER_OPTIONS,
  AGENT_STATUSES,
  statusLabel,
} from "../lib/agents-ui";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: AgentsAgent;
  submitting?: boolean;
  onSubmit: (input: CreateAgentInput & UpdateAgentInput) => Promise<void>;
  /** When set, only render this step (create wizard). */
  step?: "identity" | "harness" | "permissions" | "all";
};

export function AgentForm({
  mode,
  initial,
  submitting,
  onSubmit,
  step = "all",
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "general");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(
    initial?.instructions ?? "",
  );
  const [adapterType, setAdapterType] = useState(
    initial?.adapterType ?? "stub",
  );
  const [model, setModel] = useState(initial?.harness?.model ?? "");
  const [maxTurns, setMaxTurns] = useState(
    initial?.harness?.maxTurns != null ? String(initial.harness.maxTurns) : "20",
  );
  const [runtime, setRuntime] = useState(initial?.harness?.runtime ?? "");
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
      instructions: instructions.trim() || null,
      harness: {
        model: model.trim() || undefined,
        maxTurns: maxTurns.trim() ? Number(maxTurns) : undefined,
        runtime: runtime.trim() || undefined,
      },
      permissions: { requireRunApproval: requireApproval },
    };
    if (mode === "edit") payload.status = status;
    await onSubmit(payload);
  }

  const showIdentity = step === "all" || step === "identity";
  const showHarness = step === "all" || step === "harness";
  const showPermissions = step === "all" || step === "permissions";

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {showIdentity ? (
        <>
          <Field label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={160}
            />
          </Field>
          <Field label="Função">
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              maxLength={64}
            />
          </Field>
          <Field label="Cargo">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </Field>
          <Field label="Instruções / identidade">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={20000}
              rows={4}
              className="w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Prompt do sistema / instruções de operação"
            />
          </Field>
        </>
      ) : null}

      {showHarness ? (
        <>
          <Field label="Adapter">
            <select
              value={adapterType}
              onChange={(e) => setAdapterType(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              {AGENT_ADAPTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modelo">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              maxLength={120}
              placeholder="e.g. claude-sonnet-4"
            />
          </Field>
          <Field label="Máx. turnos">
            <Input
              value={maxTurns}
              onChange={(e) => setMaxTurns(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Nota de runtime">
            <Input
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
              maxLength={64}
              placeholder="in-process / external"
            />
          </Field>
          <Field label="Capacidades">
            <textarea
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </Field>
        </>
      ) : null}

      {showPermissions ? (
        <>
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
                    {statusLabel(value)}
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
            Exigir aprovação de execução
          </label>
        </>
      ) : null}

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
