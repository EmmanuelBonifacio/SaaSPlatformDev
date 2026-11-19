"use client";

import { Input } from "@/components/ui/input";
import {
  CUSTOM_MODEL_VALUE,
  adapterHasCuratedModels,
  modelsForAdapter,
} from "../lib/agents-ui";

type Props = {
  adapterType: string;
  model: string;
  onChange: (model: string) => void;
};

/**
 * Select curado de modelo por adapter (SP-50).
 * "Outro…" só quando o valor atual não está na lista (legado) ou o operador escolhe.
 */
export function HarnessModelSelect({ adapterType, model, onChange }: Props) {
  if (!adapterHasCuratedModels(adapterType)) {
    return (
      <p className="text-sm text-muted-foreground">
        Este adapter não usa modelo LLM configurável.
      </p>
    );
  }

  const options = modelsForAdapter(adapterType);
  const inList = options.some((opt) => opt.value === model);
  const selectValue = inList ? model : model ? CUSTOM_MODEL_VALUE : options[0]?.value;
  const showCustom = selectValue === CUSTOM_MODEL_VALUE;

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_MODEL_VALUE) {
            onChange(inList ? "" : model);
            return;
          }
          onChange(next);
        }}
        className="w-full rounded-md border bg-background p-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value={CUSTOM_MODEL_VALUE}>Outro…</option>
      </select>
      {showCustom ? (
        <Input
          value={inList ? "" : model}
          onChange={(e) => onChange(e.target.value)}
          maxLength={120}
          placeholder="ID do modelo (avançado)"
        />
      ) : null}
    </div>
  );
}
