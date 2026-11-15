import type { MemorySettings } from "@/types/memory.types";

interface MemorySettingsCardProps {
  settings: MemorySettings;
  onChange: (enabled: boolean) => void;
}

export function MemorySettingsCard({
  settings,
  onChange,
}: MemorySettingsCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Captura de sugestões</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Esta preferência será usada por integrações de agente compatíveis.
        Nenhuma integração cria sugestões automaticamente no momento, e nada
        será publicado sem sua aprovação.
      </p>
      <label className="mt-4 flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={settings.captureSuggestions}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Permitir sugestões de memória para minha conta
      </label>
    </section>
  );
}
