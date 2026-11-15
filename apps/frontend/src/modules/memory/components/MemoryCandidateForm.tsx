"use client";

import { useState, type FormEvent } from "react";
import type { CreateMemoryCandidate } from "@/services/memory.service";
import { memoryApiService } from "@/services/memory.service";
import type { MemoryCategory } from "@/types/memory.types";

const CATEGORIES: Array<{ value: MemoryCategory; label: string }> = [
  { value: "preference", label: "Preferência" },
  { value: "fact", label: "Fato" },
  { value: "decision", label: "Decisão" },
  { value: "procedure", label: "Procedimento" },
  { value: "context", label: "Contexto" },
];

const EMPTY_FORM: CreateMemoryCandidate = {
  title: "",
  content: "",
  category: "fact",
  scope: "user",
};

interface MemoryCandidateFormProps {
  isAdmin: boolean;
  onSubmitted: () => Promise<void>;
  onError: (error: unknown) => void;
}

export function MemoryCandidateForm({
  isAdmin,
  onSubmitted,
  onError,
}: MemoryCandidateFormProps) {
  const [form, setForm] = useState<CreateMemoryCandidate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof CreateMemoryCandidate>(
    key: K,
    value: CreateMemoryCandidate[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await memoryApiService.createCandidate(form);
      setForm(EMPTY_FORM);
      await onSubmitted();
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Adicionar um rascunho</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Não inclua senhas, tokens, credenciais ou dados que não sejam necessários.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Título</span>
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            maxLength={160}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Categoria</span>
          <select
            value={form.category}
            onChange={(event) => {
              const category = CATEGORIES.find(
                (item) => item.value === event.target.value,
              );
              if (category) update("category", category.value);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span>Conteúdo</span>
          <textarea
            value={form.content}
            onChange={(event) => update("content", event.target.value)}
            maxLength={4_000}
            rows={4}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        {isAdmin && (
          <label className="space-y-1 text-sm">
            <span>Escopo</span>
            <select
              value={form.scope}
              onChange={(event) => {
                const scope = event.target.value;
                if (scope === "user" || scope === "tenant") {
                  update("scope", scope);
                }
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="user">Somente minha conta</option>
              <option value="tenant">Compartilhado com a empresa</option>
            </select>
          </label>
        )}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Enviando…" : "Enviar para revisão"}
          </button>
        </div>
      </form>
    </section>
  );
}
