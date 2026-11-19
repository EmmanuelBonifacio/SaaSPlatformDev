"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentsApiService } from "@/services/agents.service";
import type { AgentsBudget } from "@/types/agents.types";
import { errorMessage } from "../../lib/agents-ui";

type Props = { agentId: string; canEdit: boolean };

export function AgentBudgetsPanel({ agentId, canEdit }: Props) {
  const [budget, setBudget] = useState<AgentsBudget | null>(null);
  const [soft, setSoft] = useState("");
  const [hard, setHard] = useState("");
  const [period, setPeriod] = useState<AgentsBudget["period"]>("month");
  const [alertPct, setAlertPct] = useState("80");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const row = await agentsApiService.getBudget(agentId);
      setBudget(row);
      setPeriod(row.period);
      setSoft(row.softLimitCents == null ? "" : String(row.softLimitCents));
      setHard(row.hardLimitCents == null ? "" : String(row.hardLimitCents));
      setAlertPct(String(row.alertThresholdPct));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError("");
    try {
      const next = await agentsApiService.updateBudget(agentId, {
        period,
        softLimitCents: soft.trim() === "" ? null : Number(soft),
        hardLimitCents: hard.trim() === "" ? null : Number(hard),
        alertThresholdPct: Number(alertPct),
      });
      setBudget(next);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Limites soft/hard em centavos. O gasto é medido pelo ledger de execuções no
        período selecionado. O rollup do tenant fica em Custos.
      </p>
      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {budget ? (
        <p className="text-sm">
          Gasto neste {budget.period}:{" "}
          <span className="font-medium">{budget.spentCents}</span> centavos
          (de execuções medidas)
        </p>
      ) : null}
      <form onSubmit={onSave} className="max-w-md space-y-3">
        <div className="space-y-1">
          <Label>Período</Label>
          <select
            value={period}
            disabled={!canEdit}
            onChange={(e) =>
              setPeriod(e.target.value as AgentsBudget["period"])
            }
            className="w-full rounded-md border bg-background p-2 text-sm"
          >
            <option value="day">dia</option>
            <option value="week">semana</option>
            <option value="month">mês</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Limite soft (centavos)</Label>
          <Input
            value={soft}
            disabled={!canEdit}
            onChange={(e) => setSoft(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label>Limite hard (centavos)</Label>
          <Input
            value={hard}
            disabled={!canEdit}
            onChange={(e) => setHard(e.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label>Limiar de alerta %</Label>
          <Input
            value={alertPct}
            disabled={!canEdit}
            onChange={(e) => setAlertPct(e.target.value)}
            inputMode="numeric"
          />
        </div>
        {canEdit ? (
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar orçamento"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Admin necessário para editar.</p>
        )}
      </form>
    </div>
  );
}
