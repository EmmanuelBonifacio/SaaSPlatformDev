import { Check, FileSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemoryEntry } from "@/types/memory.types";
import {
  CATEGORY_LABEL,
  SCOPE_LABEL,
  formatMemoryWhen,
} from "../memory.labels";

interface MemoryReportDetailProps {
  report: MemoryEntry | null;
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MemoryReportDetail({
  report,
  busy,
  onApprove,
  onReject,
}: MemoryReportDetailProps) {
  if (!report) {
    return (
      <section className="flex min-h-[28rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
        <FileSearch className="h-9 w-9 text-muted-foreground/40" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Selecione um relatório
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Veja exatamente o título, escopo e texto que serão gravados na memória
          aprovada antes de confirmar.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="space-y-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pré-visualização do que será gravado
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-foreground">
              {report.title}
            </h2>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onReject(report.id)}
            >
              <X className="mr-1.5 h-4 w-4" />
              Rejeitar
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => onApprove(report.id)}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Aprovar
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Escopo</dt>
            <dd className="mt-0.5 font-medium">{SCOPE_LABEL[report.scope]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Categoria</dt>
            <dd className="mt-0.5 font-medium">
              {CATEGORY_LABEL[report.category]}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Origem</dt>
            <dd className="mt-0.5 font-medium">
              {report.sourceType === "conversation" ? "Agente / conversa" : "Manual"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gerado em</dt>
            <dd className="mt-0.5 font-medium">
              {formatMemoryWhen(report.createdAt)}
            </dd>
          </div>
        </dl>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Conteúdo completo
        </p>
        <article className="whitespace-pre-wrap rounded-lg border border-border/80 bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
          {report.content}
        </article>
        {report.expiresAt && (
          <p className="mt-4 text-xs text-muted-foreground">
            Este rascunho expira em{" "}
            {new Date(report.expiresAt).toLocaleDateString("pt-BR")} se não for
            revisado.
          </p>
        )}
      </div>
    </section>
  );
}
