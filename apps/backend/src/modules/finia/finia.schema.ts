// =============================================================================
// src/modules/finia/finia.schema.ts
// =============================================================================
// Schemas de validação Zod para as requisições HTTP do módulo FinIA
// =============================================================================

import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(1, "A descrição é obrigatória"),
  type: z.enum(["income", "expense"]),
  category: z.string().default("Outros"),
  date: z.string().optional(),
});

export const createBillSchema = z.object({
  name: z.string().min(1, "O nome da conta é obrigatório"),
  amount: z.number().positive("O valor deve ser positivo"),
  dueDay: z.number().int().min(1).max(31, "Dia de vencimento inválido (1-31)"),
});

export const createDebtSchema = z.object({
  name: z.string().min(1, "O nome da dívida é obrigatório"),
  installmentAmount: z.number().positive("O valor da parcela deve ser positivo"),
  totalInstallments: z.number().int().min(1, "Total de parcelas deve ser no mínimo 1"),
});

export const processPdfUploadSchema = z.object({
  pdfBase64: z.string().min(1, "O arquivo PDF em base64 é obrigatório"),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type CreateBillDto = z.infer<typeof createBillSchema>;
export type CreateDebtDto = z.infer<typeof createDebtSchema>;
export type ProcessPdfUploadDto = z.infer<typeof processPdfUploadSchema>;
