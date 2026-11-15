import { Check, X } from "lucide-react";
import type { MemoryEntry } from "@/types/memory.types";

interface MemoryCandidateListProps {
  candidates: MemoryEntry[];
  loading: boolean;
  onReview: (id: string, action: "approve" | "reject") => void;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function MemoryCandidateList({
  candidates,
  loading,
  onReview,
}: MemoryCandidateListProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Rascunhos para revisar</h2>
      <p className="text-sm text-muted-foreground">
        Rascunhos pendentes são removidos após 30 dias.
      </p>
      <div className="mt-4 space-y-3">
        {candidates.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Nenhum rascunho pendente.</p>
        )}
        {candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{candidate.title}</p>
                <p className="text-xs text-muted-foreground">
                  {candidate.scope === "tenant" ? "Compartilhado" : "Pessoal"} ·{" "}
                  {candidate.category} · expira {formatDate(candidate.expiresAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onReview(candidate.id, "approve")}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-600/30 px-3 py-1.5 text-sm"
                >
                  <Check className="h-4 w-4" /> Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => onReview(candidate.id, "reject")}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm"
                >
                  <X className="h-4 w-4" /> Rejeitar
                </button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{candidate.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
