"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ClientOrigem,
  ClientPlano,
  ClientRecord,
  ClientStatus,
  UpsertClientInput,
} from "@/types/clients.types";

interface ClientDetailFormProps {
  client: ClientRecord | null;
  busy: boolean;
  initialRelatorioNota?: string;
  suggestedName?: string;
  onSave: (input: UpsertClientInput) => void;
}

type FormState = {
  nomeFantasia: string;
  cnpjCpf: string;
  status: ClientStatus;
  origem: ClientOrigem | "";
  plano: ClientPlano | "";
  mrr: string;
  responsavel: string;
  whatsapp: string;
  email: string;
  produtoContratado: string;
  dorPrincipal: string;
  objetivoSaas: string;
  tags: string;
  relatorioNota: string;
  financeiro: boolean;
  agentes: boolean;
  comercial: boolean;
};

const emptyForm = (): FormState => ({
  nomeFantasia: "",
  cnpjCpf: "",
  status: "lead",
  origem: "",
  plano: "",
  mrr: "0",
  responsavel: "",
  whatsapp: "",
  email: "",
  produtoContratado: "",
  dorPrincipal: "",
  objetivoSaas: "",
  tags: "",
  relatorioNota: "",
  financeiro: false,
  agentes: false,
  comercial: false,
});

function fromClient(client: ClientRecord | null): FormState {
  if (!client) return emptyForm();
  return {
    nomeFantasia: client.nomeFantasia,
    cnpjCpf: client.cnpjCpf ?? "",
    status: client.status,
    origem: client.origem ?? "",
    plano: client.plano ?? "",
    mrr: String(client.mrr ?? 0),
    responsavel: client.responsavel ?? "",
    whatsapp: client.whatsapp ?? "",
    email: client.email ?? "",
    produtoContratado: client.produtoContratado ?? "",
    dorPrincipal: client.dorPrincipal ?? "",
    objetivoSaas: client.objetivoSaas ?? "",
    tags: (client.tags ?? []).join(", "),
    relatorioNota: "",
    financeiro: Boolean(client.modulos?.financeiro),
    agentes: Boolean(client.modulos?.agentes),
    comercial: Boolean(client.modulos?.comercial),
  };
}

export function ClientDetailForm({
  client,
  busy,
  initialRelatorioNota = "",
  suggestedName,
  onSave,
}: ClientDetailFormProps) {
  const [form, setForm] = useState<FormState>(fromClient(client));

  useEffect(() => {
    const next = fromClient(client);
    if (!client) {
      next.nomeFantasia = suggestedName?.slice(0, 160) ?? "";
      next.relatorioNota = initialRelatorioNota;
    } else if (initialRelatorioNota) {
      next.relatorioNota = initialRelatorioNota;
    }
    setForm(next);
  }, [client, initialRelatorioNota, suggestedName]);

  const set =
    (key: keyof FormState) =>
    (value: string | boolean) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      nomeFantasia: form.nomeFantasia,
      cnpjCpf: form.cnpjCpf || null,
      status: form.status,
      origem: form.origem || null,
      plano: form.plano || null,
      mrr: Number(form.mrr) || 0,
      responsavel: form.responsavel || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      produtoContratado: form.produtoContratado || null,
      dorPrincipal: form.dorPrincipal || null,
      objetivoSaas: form.objetivoSaas || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      modulos: {
        financeiro: form.financeiro,
        agentes: form.agentes,
        comercial: form.comercial,
      },
      relatorioNota: form.relatorioNota || null,
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {client ? "Atualizar ficha" : "Novo cliente"}
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          {client?.nomeFantasia || "Salvar cliente"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mesmo CNPJ/CPF (ou mesmo nome) atualiza a ficha — não cria duplicata.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Nome fantasia</span>
            <Input
              required
              value={form.nomeFantasia}
              onChange={(e) => set("nomeFantasia")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">CNPJ/CPF</span>
            <Input
              value={form.cnpjCpf}
              onChange={(e) => set("cnpjCpf")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => set("status")(e.target.value)}
            >
              <option value="lead">Lead</option>
              <option value="proposta">Proposta</option>
              <option value="ativo">Ativo</option>
              <option value="churn">Churn</option>
              <option value="vip">VIP</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">WhatsApp</span>
            <Input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <Input
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">MRR</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.mrr}
              onChange={(e) => set("mrr")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Tags (vírgula)</span>
            <Input
              value={form.tags}
              onChange={(e) => set("tags")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Dor principal</span>
            <textarea
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.dorPrincipal}
              onChange={(e) => set("dorPrincipal")(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">
              Nota do relatório (anexa ao histórico)
            </span>
            <textarea
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.relatorioNota}
              onChange={(e) => set("relatorioNota")(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["financeiro", "Financeiro"],
              ["agentes", "Agentes"],
              ["comercial", "Comercial"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key)(e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        {client?.notasRelatorio && (
          <article className="whitespace-pre-wrap rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
            {client.notasRelatorio}
          </article>
        )}

        <Button type="submit" disabled={busy || !form.nomeFantasia.trim()}>
          <Save className="mr-1.5 h-4 w-4" />
          {client ? "Atualizar cliente" : "Salvar cliente"}
        </Button>
      </form>
    </section>
  );
}
