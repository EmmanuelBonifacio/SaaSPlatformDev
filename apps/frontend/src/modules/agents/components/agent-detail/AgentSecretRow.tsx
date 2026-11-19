"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentsSecretRef } from "@/types/agents.types";

type Props = {
  row: AgentsSecretRef;
  canEdit: boolean;
  saving: boolean;
  rotating: boolean;
  rotateValue: string;
  onRotateValueChange: (value: string) => void;
  onToggleRotate: () => void;
  onSaveRotate: () => void;
  onDelete: () => void;
};

export function AgentSecretRow({
  row,
  canEdit,
  saving,
  rotating,
  rotateValue,
  onRotateValueChange,
  onToggleRotate,
  onSaveRotate,
  onDelete,
}: Props) {
  return (
    <li className="space-y-2 rounded-md border border-border p-3">
      <div className="agents-row">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{row.name}</p>
          <p className="agents-mono">{row.envRef}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.configured ? "Configurado" : "Sem valor (só env local)"}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={onToggleRotate}
            >
              {row.configured ? "Rotacionar" : "Definir valor"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={onDelete}
            >
              Excluir
            </Button>
          </div>
        ) : null}
      </div>
      {canEdit && rotating ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Novo valor do segredo"
            value={rotateValue}
            onChange={(e) => onRotateValueChange(e.target.value)}
            maxLength={8192}
          />
          <Button
            type="button"
            size="sm"
            disabled={saving || !rotateValue.trim()}
            onClick={onSaveRotate}
          >
            Salvar
          </Button>
        </div>
      ) : null}
    </li>
  );
}
