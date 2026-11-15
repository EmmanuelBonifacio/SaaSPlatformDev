import { Loader2, Search, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import type { MemoryEntry } from "@/types/memory.types";

interface MemoryEntryListProps {
  entries: MemoryEntry[];
  loading: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onDelete: (entry: MemoryEntry) => void;
}

export function MemoryEntryList({
  entries,
  loading,
  query,
  onQueryChange,
  onSearch,
  onDelete,
}: MemoryEntryListProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Memórias aprovadas</h2>
          <p className="text-sm text-muted-foreground">
            Agentes recebem apenas resultados relevantes e limitados.
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex gap-2">
          <label className="sr-only" htmlFor="memory-search">Buscar memórias</label>
          <input
            id="memory-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            maxLength={160}
            placeholder="Buscar"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <Search className="h-4 w-4" /> Buscar
          </button>
        </form>
      </div>
      <div className="mt-4 space-y-3">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        )}
        {entries.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Nenhuma memória aprovada.</p>
        )}
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{entry.title}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.scope === "tenant" ? "Compartilhado" : "Pessoal"} ·{" "}
                  {entry.category} · atualizado{" "}
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(entry)}
                aria-label={`Excluir memória ${entry.title}`}
                className="rounded-md p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{entry.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
