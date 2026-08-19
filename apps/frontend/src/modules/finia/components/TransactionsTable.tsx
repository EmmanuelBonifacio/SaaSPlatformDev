"use client";

import React from "react";
import type { FiniaTransaction } from "@/types/finia.types";

interface TransactionsTableProps {
  transactions: FiniaTransaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
        Nenhuma transação recente encontrada.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Últimas Transações</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
          {transactions.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3">Origem</th>
              <th className="px-6 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((t) => {
              const isIncome = t.type === "income";
              return (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{t.date}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{t.description}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {t.category_name || "Outros"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs capitalize text-muted-foreground">{t.source}</td>
                  <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
                    {isIncome ? "+" : "-"} R$ {Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
