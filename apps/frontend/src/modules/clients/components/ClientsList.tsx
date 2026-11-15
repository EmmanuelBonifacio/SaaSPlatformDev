import { Building2 } from "lucide-react";
import type { ClientRecord } from "@/types/clients.types";
import {
  CLIENT_STATUS_LABEL,
  formatClientMoney,
} from "../client.labels";

interface ClientsListProps {
  clients: ClientRecord[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export function ClientsList({
  clients,
  selectedId,
  loading,
  onSelect,
}: ClientsListProps) {
  return (
    <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Clientes
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {clients.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Um card por cliente · novos relatórios atualizam a mesma ficha
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && clients.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        )}
        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhum cliente salvo</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Salve a partir de um relatório ou use o formulário ao lado.
            </p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {clients.map((client) => {
            const selected = client.id === selectedId;
            return (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => onSelect(client.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-l-2 border-l-primary bg-primary/8"
                      : "border-l-2 border-l-transparent hover:bg-muted/50"
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-medium">
                    {client.nomeFantasia}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {CLIENT_STATUS_LABEL[client.status]} ·{" "}
                    {formatClientMoney(client.mrr)}
                    {client.cnpjCpf ? ` · ${client.cnpjCpf}` : ""}
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
