import type { MemoryCategory, MemoryScope } from "@/types/memory.types";

export const CATEGORY_LABEL: Record<MemoryCategory, string> = {
  preference: "Preferência",
  fact: "Fato",
  decision: "Decisão",
  procedure: "Procedimento",
  context: "Contexto",
};

export const SCOPE_LABEL: Record<MemoryScope, string> = {
  user: "Pessoal",
  tenant: "Empresa",
};

export function formatMemoryWhen(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relatórios gerados nas últimas 24 horas. */
export function isWithinLastDay(iso: string, now = Date.now()): boolean {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= 24 * 60 * 60 * 1000;
}
