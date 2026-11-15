"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { memoryApiService } from "@/services/memory.service";
import type {
  MemoryEntry,
  MemorySettings,
} from "@/types/memory.types";
import { MemoryCandidateForm } from "./MemoryCandidateForm";
import { MemoryCandidateList } from "./MemoryCandidateList";
import { MemoryEntryList } from "./MemoryEntryList";
import { MemorySettingsCard } from "./MemorySettingsCard";

function messageFromError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação.";
}

export function MemoryManager() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [candidates, setCandidates] = useState<MemoryEntry[]>([]);
  const [settings, setSettings] = useState<MemorySettings>({
    captureSuggestions: false,
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const review = async (id: string, action: "approve" | "reject") => {
    setError(null);
    try {
      await memoryApiService.review(id, action);
      setNotice(action === "approve" ? "Memória aprovada." : "Rascunho rejeitado.");
      await refresh(query);
    } catch (reviewError) {
      setError(messageFromError(reviewError));
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
    } catch (settingError) {
      setError(messageFromError(settingError));
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">Memória dos agentes</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Consulte informações aprovadas e revise rascunhos. Memórias pessoais
          ficam privadas; fatos compartilhados exigem aprovação de administrador.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          {notice}
        </div>
      )}

      <MemorySettingsCard settings={settings} onChange={updateSettings} />
      <MemoryCandidateForm
        isAdmin={user?.role === "admin"}
        onSubmitted={async () => {
          setNotice("Rascunho criado. Ele só será usado após aprovação.");
          await refresh(query);
        }}
        onError={(submitError) => setError(messageFromError(submitError))}
      />
      <MemoryCandidateList
        candidates={candidates}
        loading={loading}
        onReview={review}
      />
      <MemoryEntryList
        entries={entries}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        onSearch={() => void refresh(query)}
        onDelete={(entry) => void remove(entry)}
      />
    </main>
  );
}
