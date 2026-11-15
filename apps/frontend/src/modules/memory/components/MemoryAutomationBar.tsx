import { Bot, Sparkles } from "lucide-react";
import type { MemorySettings } from "@/types/memory.types";

interface MemoryAutomationBarProps {
  settings: MemorySettings;
  onChange: (enabled: boolean) => void;
}

export function MemoryAutomationBar({
  settings,
  onChange,
}: MemoryAutomationBarProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Agente de captura
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quando ativo, o agente gera rascunhos automaticamente a partir das
            conversas. Nada é gravado de forma definitiva sem a sua aprovação.
          </p>
        </div>
      </div>
      <label className="inline-flex shrink-0 cursor-pointer items-center gap-3 self-start rounded-lg border border-border px-3 py-2 text-sm sm:self-center">
        <span className="text-muted-foreground">Automação</span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Ativar captura automática de memória"
          checked={settings.captureSuggestions}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <span className="font-medium">
          {settings.captureSuggestions ? "Ligado" : "Desligado"}
        </span>
      </label>
    </section>
  );
}
