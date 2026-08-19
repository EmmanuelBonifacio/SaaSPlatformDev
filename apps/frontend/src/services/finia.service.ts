// =============================================================================
// src/services/finia.service.ts
// =============================================================================
// Cliente API do Frontend para o módulo FinIA
// =============================================================================

import api from "./api";
import type {
  FiniaDashboardSummary,
  FiniaTransaction,
  FiniaBill,
  FiniaDebt,
  CreateTransactionPayload,
  CreateBillPayload,
  CreateDebtPayload,
} from "@/types/finia.types";

export const finiaApiService = {
  async getDashboardSummary(month?: number, year?: number): Promise<FiniaDashboardSummary> {
    const params: Record<string, any> = {};
    if (month) params.month = month;
    if (year) params.year = year;

    const res = await api.get<FiniaDashboardSummary>("/finia/dashboard", { params });
    return res.data;
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<FiniaTransaction> {
    const res = await api.post<FiniaTransaction>("/finia/transacao", payload);
    return res.data;
  },

  async createBill(payload: CreateBillPayload): Promise<FiniaBill> {
    const res = await api.post<FiniaBill>("/finia/conta-fixa", payload);
    return res.data;
  },

  async createDebt(payload: CreateDebtPayload): Promise<FiniaDebt> {
    const res = await api.post<FiniaDebt>("/finia/divida", payload);
    return res.data;
  },

  async uploadPdfExtrato(file: File): Promise<{ message: string; transactions: FiniaTransaction[] }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/finia/upload-extrato", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async getWhatsAppQrCode(): Promise<{ qrcode?: string; status: string }> {
    const res = await api.get<{ qrcode?: string; status: string }>("/finia/qr-code");
    return res.data;
  },
};
