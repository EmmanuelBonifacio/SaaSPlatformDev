// =============================================================================
// src/modules/finia/finia.service.ts
// =============================================================================
// Lógica de negócio do FinIA com suporte a Schema isolado por Tenant no Postgres
// =============================================================================

import { withTenantSchema, prisma } from "../../core/database/prisma";
import { finiaAiService } from "./finia.ai.service";
import { evolutionService } from "./finia.evolution.service";
import type {
  FiniaDashboardSummary,
  FiniaTransaction,
  FiniaBill,
  FiniaDebt,
  WhatsAppWebhookPayload,
} from "./finia.types";

export class FiniaService {
  /**
   * Converte o identificador do tenant (id UUID, slug ou schemaName) em um nome de schema válido
   */
  private async resolveSchemaName(identifier: string): Promise<string> {
    if (!identifier) return "public";
    if (identifier.startsWith("tenant_") && !identifier.includes("-")) {
      return identifier.toLowerCase();
    }

    // Se for UUID ou slug, consulta na tabela public.tenants ou converte
    try {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: identifier },
            { slug: identifier },
            { schemaName: identifier },
          ],
        },
        select: { schemaName: true },
      });

      if (tenant?.schemaName) {
        return tenant.schemaName;
      }
    } catch {
      // Fallback de higienização
    }

    const clean = identifier.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    return clean.startsWith("tenant_") ? clean : `tenant_${clean}`;
  }

  /**
   * Garante a existência das tabelas no schema do tenant
   */
  private async ensureTenantTables(tenantIdentifier: string): Promise<string> {
    const schemaName = await this.resolveSchemaName(tenantIdentifier);

    await withTenantSchema(schemaName, async (prismaClient) => {
      await prismaClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS finia_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          color VARCHAR(20) DEFAULT '#3b82f6',
          type VARCHAR(20) DEFAULT 'expense'
        );

        CREATE TABLE IF NOT EXISTS finia_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(100),
          type VARCHAR(20) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          description TEXT NOT NULL,
          category_name VARCHAR(100) DEFAULT 'Outros',
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          source VARCHAR(20) DEFAULT 'web',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS finia_bills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(100),
          name VARCHAR(150) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          due_day INT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          category_name VARCHAR(100) DEFAULT 'Moradia',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS finia_debts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(100),
          name VARCHAR(150) NOT NULL,
          installment_amount DECIMAL(12,2) NOT NULL,
          total_installments INT NOT NULL,
          current_installment INT DEFAULT 1,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW()
        );

        INSERT INTO finia_categories (name, color, type)
        VALUES 
          ('Alimentação', '#ef4444', 'expense'),
          ('Transporte', '#f59e0b', 'expense'),
          ('Moradia', '#3b82f6', 'expense'),
          ('Saúde', '#10b981', 'expense'),
          ('Lazer', '#ec4899', 'expense'),
          ('Educação', '#8b5cf6', 'expense'),
          ('Outros', '#6b7280', 'expense')
        ON CONFLICT (name) DO NOTHING;
      `);
    });

    return schemaName;
  }

  /**
   * Retorna o resumo do Dashboard do mês
   */
  async getDashboardSummary(tenantIdentifier: string, month?: number, year?: number): Promise<FiniaDashboardSummary> {
    const schemaName = await this.ensureTenantTables(tenantIdentifier);
    const targetMonth = month ?? new Date().getMonth() + 1;
    const targetYear = year ?? new Date().getFullYear();

    return withTenantSchema(schemaName, async (prismaClient) => {
      const transactions = (await prismaClient.$queryRawUnsafe(`
        SELECT id, type, amount::float, description, category_name as "category_name", date::text, source, created_at::text
        FROM finia_transactions
        WHERE EXTRACT(MONTH FROM date) = ${targetMonth} AND EXTRACT(YEAR FROM date) = ${targetYear}
        ORDER BY date DESC, created_at DESC
      `)) as FiniaTransaction[];

      const bills = (await prismaClient.$queryRawUnsafe(`
        SELECT id, name, amount::float, due_day as "due_day", status, category_name as "category_name", created_at::text
        FROM finia_bills
        ORDER BY due_day ASC
      `)) as FiniaBill[];

      const debts = (await prismaClient.$queryRawUnsafe(`
        SELECT id, name, installment_amount::float as "installment_amount", total_installments as "total_installments", current_installment as "current_installment", status, created_at::text
        FROM finia_debts
        ORDER BY created_at DESC
      `)) as FiniaDebt[];

      let totalIncome = 0;
      let totalExpense = 0;
      const catMap: Record<string, number> = {};

      for (const t of transactions) {
        if (t.type === "income") {
          totalIncome += t.amount;
        } else {
          totalExpense += t.amount;
          const cat = t.category_name || "Outros";
          catMap[cat] = (catMap[cat] || 0) + t.amount;
        }
      }

      const colors: Record<string, string> = {
        Alimentação: "#ef4444",
        Transporte: "#f59e0b",
        Moradia: "#3b82f6",
        Saúde: "#10b981",
        Lazer: "#ec4899",
        Educação: "#8b5cf6",
        Outros: "#6b7280",
      };

      const categoryExpenses = Object.keys(catMap).map((cat) => ({
        category: cat,
        amount: catMap[cat],
        color: colors[cat] || "#9ca3af",
      }));

      return {
        balance: totalIncome - totalExpense,
        totalIncome,
        totalExpense,
        categoryExpenses,
        recentTransactions: transactions,
        bills,
        debts,
      };
    });
  }

  /**
   * Lança uma nova transação no banco
   */
  async createTransaction(tenantIdentifier: string, data: { amount: number; description: string; type: "income" | "expense"; category?: string; date?: string; source?: string }): Promise<FiniaTransaction> {
    const schemaName = await this.ensureTenantTables(tenantIdentifier);
    const dateStr = data.date || new Date().toISOString().split("T")[0];
    const cat = data.category || "Outros";
    const src = data.source || "web";

    return withTenantSchema(schemaName, async (prismaClient) => {
      const res = (await prismaClient.$queryRawUnsafe(`
        INSERT INTO finia_transactions (type, amount, description, category_name, date, source)
        VALUES ('${data.type}', ${data.amount}, '${data.description.replace(/'/g, "''")}', '${cat}', '${dateStr}', '${src}')
        RETURNING id, type, amount::float, description, category_name as "category_name", date::text, source, created_at::text
      `)) as FiniaTransaction[];

      return res[0];
    });
  }

  /**
   * Lança uma conta fixa no banco
   */
  async createBill(tenantIdentifier: string, data: { name: string; amount: number; dueDay: number }): Promise<FiniaBill> {
    const schemaName = await this.ensureTenantTables(tenantIdentifier);

    return withTenantSchema(schemaName, async (prismaClient) => {
      const res = (await prismaClient.$queryRawUnsafe(`
        INSERT INTO finia_bills (name, amount, due_day)
        VALUES ('${data.name.replace(/'/g, "''")}', ${data.amount}, ${data.dueDay})
        RETURNING id, name, amount::float, due_day as "due_day", status, category_name as "category_name", created_at::text
      `)) as FiniaBill[];

      return res[0];
    });
  }

  /**
   * Lança uma dívida/compra parcelada no banco
   */
  async createDebt(tenantIdentifier: string, data: { name: string; installmentAmount: number; totalInstallments: number }): Promise<FiniaDebt> {
    const schemaName = await this.ensureTenantTables(tenantIdentifier);

    return withTenantSchema(schemaName, async (prismaClient) => {
      const res = (await prismaClient.$queryRawUnsafe(`
        INSERT INTO finia_debts (name, installment_amount, total_installments)
        VALUES ('${data.name.replace(/'/g, "''")}', ${data.installmentAmount}, ${data.totalInstallments})
        RETURNING id, name, installment_amount::float as "installment_amount", total_installments as "total_installments", current_installment as "current_installment", status, created_at::text
      `)) as FiniaDebt[];

      return res[0];
    });
  }

  /**
   * Processa o upload de extrato PDF com o Claude Vision
   */
  async processPdfBuffer(tenantIdentifier: string, pdfBuffer: Buffer): Promise<{ transactionsCreated: number; items: any[] }> {
    const schemaName = await this.ensureTenantTables(tenantIdentifier);
    const parsedItems = await finiaAiService.parsePdfExtract(pdfBuffer);

    let count = 0;
    for (const item of parsedItems) {
      await this.createTransaction(schemaName, {
        amount: item.amount,
        description: item.description,
        type: item.type,
        category: item.category,
        date: item.date,
        source: "pdf",
      });
      count++;
    }

    return { transactionsCreated: count, items: parsedItems };
  }

  /**
   * Processa webhook recebido da Evolution API (mensagem do WhatsApp)
   */
  async handleWhatsAppWebhook(tenantIdentifier: string, payload: WhatsAppWebhookPayload): Promise<string> {
    const schemaName = await this.ensureTenantTables(tenantIdentifier);
    const msg = payload.data?.message?.conversation || payload.data?.message?.extendedTextMessage?.text;
    const fromMe = payload.data?.key?.fromMe;
    const remoteJid = payload.data?.key?.remoteJid;
    const instanceName = payload.instance || schemaName;

    if (!msg || fromMe || !remoteJid) return "ignored";

    // Chama o Anthropic Claude com Tool Calling
    const aiRes = await finiaAiService.processUserMessage(msg);

    // Executa as tools chamadas pela IA
    for (const tool of aiRes.toolCalls) {
      if (tool.name === "criar_transacao") {
        await this.createTransaction(schemaName, {
          amount: tool.args.valor,
          description: tool.args.descricao,
          type: tool.args.tipo,
          category: tool.args.categoria,
          date: tool.args.data,
          source: "whatsapp",
        });
      } else if (tool.name === "criar_conta_fixa") {
        await this.createBill(schemaName, {
          name: tool.args.nome,
          amount: tool.args.valor,
          dueDay: tool.args.dia_vencimento,
        });
      } else if (tool.name === "criar_divida_parcelada") {
        await this.createDebt(schemaName, {
          name: tool.args.nome,
          installmentAmount: tool.args.valor_parcela,
          totalInstallments: tool.args.total_parcelas,
        });
      }
    }

    // Envia resposta de volta via WhatsApp
    const responseText = aiRes.replyText || "Sua solicitação foi processada com sucesso!";
    await evolutionService.sendTextMessage(instanceName, remoteJid, responseText);

    return responseText;
  }

  /**
   * Obtém QR Code para parear WhatsApp da Evolution API
   */
  async getWhatsAppQrCode(tenantIdentifier: string): Promise<{ qrcode?: string; status: string }> {
    const schemaName = await this.resolveSchemaName(tenantIdentifier);
    return evolutionService.getQrCode(schemaName);
  }
}

export const finiaService = new FiniaService();
