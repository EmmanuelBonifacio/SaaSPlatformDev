import { ClipboardList } from "lucide-react";
import type { MemoryEntry } from "@/types/memory.types";
import {
  CATEGORY_LABEL,
  SCOPE_LABEL,
  formatMemoryWhen,
} from "../memory.labels";

interface MemoryInboxProps {
  reports: MemoryEntry[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function MemoryInbox({
  reports,
  selectedId,
  loading,
  onSelect,
}: MemoryInboxProps) {
  return (
    <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            Relatórios do dia
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {reports.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pendentes das últimas 24 horas · clique para revisar o conteúdo completo
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && reports.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        )}
        {!loading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              Nenhum relatório para aprovar
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Os rascunhos gerados pelo agente nas últimas 24 horas aparecem
              aqui para revisão.
            </p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {reports.map((report) => {
            const selected = report.id === selectedId;
            return (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => onSelect(report.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selected
                      ? "bg-primary/8 border-l-2 border-l-primary"
                      : "hover:bg-muted/50 border-l-2 border-l-transparent"
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {report.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {report.content}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{formatMemoryWhen(report.createdAt)}</span>
                    <span>·</span>
                    <span>{SCOPE_LABEL[report.scope]}</span>
                    <span>·</span>
                    <span>{CATEGORY_LABEL[report.category]}</span>
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
