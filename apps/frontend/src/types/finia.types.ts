// =============================================================================
// src/types/finia.types.ts
// =============================================================================
// Tipos TypeScript para o Frontend do módulo FinIA
// =============================================================================

export type TransactionType = "income" | "expense";
export type TransactionSource = "whatsapp" | "web" | "pdf";
export type BillStatus = "pending" | "paid";
export type DebtStatus = "active" | "completed";

export interface FiniaTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_name?: string;
  date: string;
  source: TransactionSource;
  created_at: string;
}

export interface FiniaBill {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  status: BillStatus;
  category_name?: string;
  created_at: string;
}

export interface FiniaDebt {
  id: string;
  name: string;
  installment_amount: number;
  total_installments: number;
  current_installment: number;
  status: DebtStatus;
  created_at: string;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  color: string;
}

export interface FiniaDashboardSummary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  categoryExpenses: CategoryExpense[];
  recentTransactions: FiniaTransaction[];
  bills: FiniaBill[];
  debts: FiniaDebt[];
}

export interface CreateTransactionPayload {
  amount: number;
  description: string;
  type: TransactionType;
  category?: string;
  date?: string;
}

export interface CreateBillPayload {
  name: string;
  amount: number;
  dueDay: number;
}

export interface CreateDebtPayload {
  name: string;
  installmentAmount: number;
  totalInstallments: number;
}
