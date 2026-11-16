import type { ClientRecord } from "@/types/clients.types";
import {
  CLIENT_STATUS_LABEL,
  formatClientMoney,
} from "../client.labels";

interface ClientCardProps {
  client: ClientRecord;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function ClientCard({ client, selected, onSelect }: ClientCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(client.id)}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {client.nomeFantasia}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {client.cnpjCpf || "Sem documento"}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {CLIENT_STATUS_LABEL[client.status]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{formatClientMoney(client.mrr)}</span>
        {client.plano && <span className="capitalize">{client.plano}</span>}
        {client.whatsapp && <span>{client.whatsapp}</span>}
      </div>
      {client.tags.length > 0 && (
        <p className="mt-2 line-clamp-1 text-[11px] text-muted-foreground">
          {client.tags.join(" · ")}
        </p>
      )}
    </button>
  );
}
