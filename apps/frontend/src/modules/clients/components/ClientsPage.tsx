"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientsApiService } from "@/services/clients.service";
import type { ClientRecord, UpsertClientInput } from "@/types/clients.types";
import { ClientCard } from "./ClientCard";
import { ClientDetailForm } from "./ClientDetailForm";

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => clients.find((item) => item.id === selectedId) ?? null,
    [clients, selectedId],
  );

  const refresh = useCallback(async (search = "") => {
    setLoading(true);
    setError(null);
    try {
      setClients(await clientsApiService.list(search));
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

  const save = async (input: UpsertClientInput) => {
    setBusy(true);
    setError(null);
    try {
      const result = await clientsApiService.upsert(input);
      setNotice(
        result.created
          ? "Cliente criado."
          : "Cliente atualizado (sem duplicar).",
      );
      setDraftMode(false);
      await refresh(query);
      setSelectedId(result.client.id);
    } catch (saveError) {
      setError(messageFromError(saveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Um card por cliente. Mesmo CNPJ ou nome atualiza a ficha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void refresh(query);
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente…"
              aria-label="Buscar clientes"
              className="w-48 sm:w-56"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
          <Button
            type="button"
            onClick={() => {
              setDraftMode(true);
              setSelectedId(null);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"
        >
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-3">
          {loading && clients.length === 0 && (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          )}
          {!loading && clients.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-16 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nenhum cliente ainda</p>
              <p className="text-xs text-muted-foreground">
                Clique em Novo para cadastrar a primeira ficha.
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                selected={!draftMode && client.id === selectedId}
                onSelect={(id) => {
                  setDraftMode(false);
                  setSelectedId(id);
                }}
              />
            ))}
          </div>
        </section>

        <ClientDetailForm
          client={draftMode ? null : selected}
          busy={busy}
          onSave={(input) => void save(input)}
        />
      </div>
    </div>
  );
}
