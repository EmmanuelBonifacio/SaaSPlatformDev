"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import type { CreateAgentInput } from "@/types/agents.types";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";
import {
  AGENT_ADAPTER_OPTIONS,
  defaultModelForAdapter,
  errorMessage,
} from "../lib/agents-ui";
import { PageHeader } from "./board/PageHeader";
import { HarnessModelSelect } from "./HarnessModelSelect";

type Step = 0 | 1 | 2;

const STEPS = ["Identidade", "Harness", "Permissões"] as const;

export function AgentCreatePanel() {
  const base = useAgentsBasePath();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("general");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [adapterType, setAdapterType] = useState("stub");
  const [model, setModel] = useState("");
  const [maxTurns, setMaxTurns] = useState("20");
  const [capabilities, setCapabilities] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);

  async function finish() {
    setSaving(true);
    setError("");
    const input: CreateAgentInput = {
      name: name.trim(),
      role: role.trim() || "general",
      title: title.trim() || null,
      instructions: instructions.trim() || null,
      adapterType,
      capabilities: capabilities.trim() || null,
      harness: {
        model: model.trim() || undefined,
        maxTurns: maxTurns.trim() ? Number(maxTurns) : undefined,
        runtime:
          AGENT_ADAPTER_OPTIONS.find((o) => o.value === adapterType)?.runtime,
      },
      permissions: { requireRunApproval: requireApproval },
    };
    try {
      const agent = await agentsApiService.createAgent(input);
      router.push(`${base}/${agent.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem criar agentes.
        </p>
        <Link href={`${base}/list`} className="text-sm text-primary hover:underline">
          Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Novo agente"
        description="Assistente: identidade → harness/adapter → permissões."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`${base}/list`}>Cancelar</Link>
          </Button>
        }
      />

      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-md border px-2 py-1 ${
              step === index
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="max-w-xl space-y-3">
          <Field
            label="Nome"
            value={name}
            onChange={setName}
            required
            maxLength={160}
          />
          <Field label="Função" value={role} onChange={setRole} maxLength={64} />
          <Field
            label="Cargo"
            value={title}
            onChange={setTitle}
            maxLength={160}
          />
          <label className="block space-y-1 text-sm">
            <span>Instruções</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              maxLength={20000}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </label>
          <Button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(1)}
          >
            Próximo: harness
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="max-w-xl space-y-3">
          <label className="block space-y-1 text-sm">
            <span>Adapter</span>
            <select
              value={adapterType}
              onChange={(e) => {
                const next = e.target.value;
                setAdapterType(next);
                setModel(defaultModelForAdapter(next));
              }}
              className="w-full rounded-md border bg-background p-2 text-sm"
            >
              {AGENT_ADAPTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Modelo</span>
            <HarnessModelSelect
              adapterType={adapterType}
              model={model}
              onChange={setModel}
            />
          </label>
          <Field
            label="Máx. turnos"
            value={maxTurns}
            onChange={setMaxTurns}
          />
          <label className="block space-y-1 text-sm">
            <span>Capacidades</span>
            <textarea
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              Próximo: permissões
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="max-w-xl space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
            />
            Exigir aprovação de execução
          </label>
          <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
            Revisão: <strong className="text-foreground">{name || "—"}</strong> ·{" "}
            {adapterType}
            {model ? ` · ${model}` : ""}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void finish()}
            >
              {saving ? "Criando..." : "Criar agente"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        className="w-full rounded-md border bg-background p-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
      />
    </label>
  );
}
