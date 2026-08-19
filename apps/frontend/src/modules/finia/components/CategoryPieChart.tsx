"use client";

import React from "react";
import type { CategoryExpense } from "@/types/finia.types";

interface CategoryPieChartProps {
  data: CategoryExpense[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = data.reduce((acc, item) => acc + item.amount, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground">
        Nenhum gasto registrado neste mês.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Gastos por Categoria</h3>
      
      {/* Barra de Distribuição de Categoria */}
      <div className="h-4 w-full flex rounded-full overflow-hidden bg-muted mb-6">
        {data.map((item, idx) => {
          const pct = ((item.amount / total) * 100).toFixed(1);
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: item.color }}
              title={`${item.category}: R$ ${item.amount.toFixed(2)} (${pct}%)`}
              className="h-full transition-all duration-300 hover:opacity-80"
            />
          );
        })}
      </div>

      {/* Legenda de Categorias */}
      <div className="grid grid-cols-2 gap-3">
        {data.map((item, idx) => {
          const pct = ((item.amount / total) * 100).toFixed(1);
          return (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-foreground truncate">{item.category}</span>
              </div>
              <div className="text-right font-semibold text-foreground">
                R$ {item.amount.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
