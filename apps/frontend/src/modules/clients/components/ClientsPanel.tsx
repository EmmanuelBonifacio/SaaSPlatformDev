"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clientsApiService } from "@/services/clients.service";
import type { ClientRecord, UpsertClientInput } from "@/types/clients.types";
import { ClientDetailForm } from "./ClientDetailForm";
import { ClientsList } from "./ClientsList";

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

interface ClientsPanelProps {
  seedFromReport?: { title: string; content: string } | null;
}

export function ClientsPanel({ seedFromReport }: ClientsPanelProps) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [seedNote, setSeedNote] = useState("");

  const selected = useMemo(
    () => clients.find((item) => item.id === selectedId) ?? null,
    [clients, selectedId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClients(await clientsApiService.list());
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (draftMode) return;
    if (clients.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !clients.some((item) => item.id === selectedId)) {
      setSelectedId(clients[0].id);
    }
  }, [clients, selectedId, draftMode]);

  useEffect(() => {
    if (!seedFromReport) return;
    setSeedNote(
      `${seedFromReport.title}\n\n${seedFromReport.content}`.slice(0, 8000),
    );
    setDraftMode(true);
    setSelectedId(null);
  }, [seedFromReport]);

  const save = async (input: UpsertClientInput) => {
    setBusy(true);
    setError(null);
    try {
      const result = await clientsApiService.upsert({
        ...input,
        relatorioNota: input.relatorioNota || seedNote || null,
      });
      setNotice(
        result.created
          ? "Cliente criado."
          : "Cliente atualizado (sem duplicar).",
      );
      setSeedNote("");
      setDraftMode(false);
      await refresh();
      setSelectedId(result.client.id);
    } catch (saveError) {
      setError(messageFromError(saveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm text-primary underline-offset-2 hover:underline"
          onClick={() => {
            setDraftMode(true);
            setSelectedId(null);
          }}
        >
          Novo cliente
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <ClientsList
          clients={clients}
          selectedId={draftMode ? null : selectedId}
          loading={loading}
          onSelect={(id) => {
            setDraftMode(false);
            setSelectedId(id);
          }}
        />
        <ClientDetailForm
          client={draftMode ? null : selected}
          busy={busy}
          initialRelatorioNota={seedNote}
          suggestedName={seedFromReport?.title}
          onSave={(input) => void save(input)}
        />
      </div>
    </div>
  );
}
