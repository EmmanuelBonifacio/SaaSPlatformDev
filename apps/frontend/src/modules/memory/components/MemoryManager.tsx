"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { memoryApiService } from "@/services/memory.service";
import type { MemoryEntry } from "@/types/memory.types";
import { ClientsPanel } from "@/modules/clients/components/ClientsPanel";
import { isWithinLastDay } from "../memory.labels";
import { MemoryInbox } from "./MemoryInbox";
import { MemoryLibrary } from "./MemoryLibrary";
import { MemoryReportDetail } from "./MemoryReportDetail";

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

type MemoryTab = "relatorios" | "clientes";

export function MemoryManager() {
  const [tab, setTab] = useState<MemoryTab>("relatorios");
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [candidates, setCandidates] = useState<MemoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const dayReports = useMemo(() => {
    return candidates
      .filter((item) => isWithinLastDay(item.createdAt))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [candidates]);

  const selected = useMemo(
    () => dayReports.find((item) => item.id === selectedId) ?? null,
    [dayReports, selectedId],
  );

  const refresh = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const [nextEntries, nextCandidates, settings] = await Promise.all([
        memoryApiService.list(search),
        memoryApiService.candidates(),
        memoryApiService.getSettings(),
      ]);
      setEntries(nextEntries);
      setCandidates(nextCandidates);
      if (!settings.captureSuggestions) {
        await memoryApiService.updateSettings(true);
      }
    } catch (loadError) {
      setError(messageFromError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

  useEffect(() => {
    if (dayReports.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !dayReports.some((item) => item.id === selectedId)) {
      setSelectedId(dayReports[0].id);
    }
  }, [dayReports, selectedId]);

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    setError(null);
    try {
      await memoryApiService.review(id, action);
      setNotice(
        action === "approve"
          ? "Relatório aprovado e gravado na memória."
          : "Relatório rejeitado.",
      );
      await refresh(query);
    } catch (reviewError) {
      setError(messageFromError(reviewError));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: MemoryEntry) => {
    setError(null);
    try {
      await memoryApiService.remove(entry.id);
      setNotice("Memória excluída.");
      await refresh(query);
    } catch (deleteError) {
      setError(messageFromError(deleteError));
    }
  };

  const saveReportAsClient = (report: MemoryEntry) => {
    setClientSeed({ title: report.title, content: report.content });
    setTab("clientes");
    setNotice("Abra a ficha do cliente e salve — o mesmo CNPJ/nome atualiza.");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Memória
        </h1>
        <div className="flex gap-2 border-b border-border">
          {(
            [
              ["relatorios", "Relatórios do dia"],
              ["clientes", "Clientes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
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

      {tab === "relatorios" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <MemoryInbox
              reports={dayReports}
              selectedId={selectedId}
              loading={loading}
              onSelect={setSelectedId}
            />
            <div className="space-y-3">
              <MemoryReportDetail
                report={selected}
                busy={busy}
                onApprove={(id) => void review(id, "approve")}
                onReject={(id) => void review(id, "reject")}
              />
              {selected && (
                <button
                  type="button"
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
                  onClick={() => saveReportAsClient(selected)}
                >
                  Salvar este relatório no cliente
                </button>
              )}
            </div>
          </div>
          <MemoryLibrary
            entries={entries}
            loading={loading}
            query={query}
            onQueryChange={setQuery}
            onSearch={() => void refresh(query)}
            onDelete={(entry) => void remove(entry)}
          />
        </>
      ) : (
        <ClientsPanel seedFromReport={clientSeed} />
      )}
    </div>
  );
}
