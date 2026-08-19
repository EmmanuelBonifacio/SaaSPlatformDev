// =============================================================================
// src/modules/finia/finia.types.ts
// =============================================================================
// Contratos de tipos TypeScript para o módulo FinIA
// =============================================================================

export type TransactionType = "income" | "expense";
export type TransactionSource = "whatsapp" | "web" | "pdf";
export type BillStatus = "pending" | "paid";
export type DebtStatus = "active" | "completed";

export interface FiniaCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  type: TransactionType;
}

export interface FiniaTransaction {
  id: string;
  user_id?: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id?: string;
  category_name?: string;
  date: string;
  source: TransactionSource;
  created_at: string;
}

export interface FiniaBill {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  due_day: number;
  status: BillStatus;
  category_id?: string;
  category_name?: string;
  created_at: string;
}

export interface FiniaDebt {
  id: string;
  user_id?: string;
  name: string;
  installment_amount: number;
  total_installments: number;
  current_installment: number;
  status: DebtStatus;
  created_at: string;
}

export interface FiniaDashboardSummary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  categoryExpenses: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
  recentTransactions: FiniaTransaction[];
  bills: FiniaBill[];
  debts: FiniaDebt[];
}

export interface WhatsAppWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
      documentMessage?: {
        url?: string;
        mimetype?: string;
        title?: string;
      };
    };
  };
}
