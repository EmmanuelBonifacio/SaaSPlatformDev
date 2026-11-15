"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { memoryApiService } from "@/services/memory.service";
import type { MemoryEntry, MemorySettings } from "@/types/memory.types";
import { isWithinLastDay } from "../memory.labels";
import { MemoryAutomationBar } from "./MemoryAutomationBar";
import { MemoryInbox } from "./MemoryInbox";
import { MemoryLibrary } from "./MemoryLibrary";
import { MemoryReportDetail } from "./MemoryReportDetail";

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

export function MemoryManager() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [candidates, setCandidates] = useState<MemoryEntry[]>([]);
  const [settings, setSettings] = useState<MemorySettings>({
    captureSuggestions: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      const [nextEntries, nextCandidates, nextSettings] = await Promise.all([
        memoryApiService.list(search),
        memoryApiService.candidates(),
        memoryApiService.getSettings(),
      ]);
      setEntries(nextEntries);
      setCandidates(nextCandidates);
      setSettings(nextSettings);
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

  const updateSettings = async (captureSuggestions: boolean) => {
    setError(null);
    try {
      setSettings(await memoryApiService.updateSettings(captureSuggestions));
      setNotice(
        captureSuggestions
          ? "Automação ligada: o agente poderá sugerir memórias."
          : "Automação desligada.",
      );
    } catch (settingError) {
      setError(messageFromError(settingError));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Memória dos agentes
            </h1>
            <p className="text-sm text-muted-foreground">
              Central de aprovação: revise o que o agente quer gravar hoje e
              libere só o que fizer sentido.
            </p>
          </div>
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

      <MemoryAutomationBar settings={settings} onChange={updateSettings} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <MemoryInbox
          reports={dayReports}
          selectedId={selectedId}
          loading={loading}
          onSelect={setSelectedId}
        />
        <MemoryReportDetail
          report={selected}
          busy={busy}
          onApprove={(id) => void review(id, "approve")}
          onReject={(id) => void review(id, "reject")}
        />
      </div>

      <MemoryLibrary
        entries={entries}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        onSearch={() => void refresh(query)}
        onDelete={(entry) => void remove(entry)}
      />
    </div>
  );
}
