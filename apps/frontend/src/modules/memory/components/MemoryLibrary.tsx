import { Library, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MemoryEntry } from "@/types/memory.types";
import {
  CATEGORY_LABEL,
  SCOPE_LABEL,
  formatMemoryWhen,
} from "../memory.labels";

interface MemoryLibraryProps {
  entries: MemoryEntry[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onDelete: (entry: MemoryEntry) => void;
}

export function MemoryLibrary({
  entries,
  loading,
  query,
  onQueryChange,
  onSearch,
  onDelete,
}: MemoryLibraryProps) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Library className="h-4 w-4 text-primary" aria-hidden="true" />
            Memória aprovada
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Conhecimento já liberado para os agentes usarem
          </p>
        </div>
        <form
          className="flex w-full gap-2 sm:max-w-sm"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar na memória…"
            aria-label="Buscar memórias aprovadas"
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Buscar">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </header>

      <div className="divide-y divide-border">
        {loading && entries.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        )}
        {!loading && entries.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            Nenhuma memória aprovada ainda.
          </p>
        )}
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{entry.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {entry.content}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {SCOPE_LABEL[entry.scope]} · {CATEGORY_LABEL[entry.category]} ·{" "}
                {formatMemoryWhen(entry.updatedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(entry)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Excluir
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
