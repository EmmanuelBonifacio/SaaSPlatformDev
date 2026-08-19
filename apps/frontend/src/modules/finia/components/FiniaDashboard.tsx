"use client";

import React, { useState, useEffect } from "react";
import { finiaApiService } from "@/services/finia.service";
import type { FiniaDashboardSummary } from "@/types/finia.types";
import { CategoryPieChart } from "./CategoryPieChart";
import { TransactionsTable } from "./TransactionsTable";
import { PdfUploadModal } from "./PdfUploadModal";
import { WhatsAppQrModal } from "./WhatsAppQrModal";
import { Sparkles, Upload, QrCode, ArrowUpRight, ArrowDownRight, Wallet, Calendar, Plus } from "lucide-react";

export function FiniaDashboard() {
  const [summary, setSummary] = useState<FiniaDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await finiaApiService.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Erro ao carregar resumo FinIA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">FinIA Assistente</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gerenciamento financeiro pessoal automatizado por Inteligência Artificial (Claude 3.5 Sonnet & WhatsApp).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setQrModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-sm font-semibold transition-colors shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            Conectar WhatsApp
          </button>
          <button
            onClick={() => setPdfModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Upload PDF Extrato
          </button>
        </div>
      </div>

      {/* MÉTRICAS DE SALDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Saldo do Mês</span>
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <div className={`text-3xl font-extrabold mt-3 ${(summary?.balance || 0) >= 0 ? "text-foreground" : "text-rose-500"}`}>
            R$ {(summary?.balance || 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Saldo acumulado das movimentações do mês</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Entradas (Receitas)</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-500 mt-3">
            R$ {(summary?.totalIncome || 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total de receitas recebidas</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Saídas (Despesas)</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <ArrowDownRight className="h-5 w-5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-rose-500 mt-3">
            R$ {(summary?.totalExpense || 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total de custos e compras efetuadas</p>
        </div>
      </div>

      {/* GRÁFICO E LISTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryPieChart data={summary?.categoryExpenses || []} />

        {/* CONTAS FIXAS & DÍVIDAS */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Contas Fixas Recorrentes
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {summary?.bills.length || 0} ativas
              </span>
            </div>

            {summary?.bills && summary.bills.length > 0 ? (
              <div className="space-y-2">
                {summary.bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                    <div>
                      <span className="font-semibold text-foreground">{b.name}</span>
                      <p className="text-xs text-muted-foreground">Vence todo dia {b.due_day}</p>
                    </div>
                    <span className="font-bold text-foreground">R$ {b.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta fixa cadastrada.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Dívidas e Parcelamentos</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {summary?.debts.length || 0} registros
              </span>
            </div>

            {summary?.debts && summary.debts.length > 0 ? (
              <div className="space-y-2">
                {summary.debts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                    <div>
                      <span className="font-semibold text-foreground">{d.name}</span>
                      <p className="text-xs text-muted-foreground">
                        Parcela {d.current_installment} de {d.total_installments}
                      </p>
                    </div>
                    <span className="font-bold text-rose-500">R$ {d.installment_amount.toFixed(2)}/mês</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum parcelamento ativo.</p>
            )}
          </div>
        </div>
      </div>

      {/* TRANSAÇÕES RECENTES */}
      <TransactionsTable transactions={summary?.recentTransactions || []} />

      {/* MODAIS */}
      <PdfUploadModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onSuccess={loadData}
      />
      <WhatsAppQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
}
