// =============================================================================
// src/modules/finia/finia.routes.ts
// =============================================================================
// Definição das rotas Fastify do módulo FinIA
// =============================================================================

import type { FastifyInstance } from "fastify";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import {
  getDashboardHandler,
  createTransactionHandler,
  createBillHandler,
  createDebtHandler,
  uploadPdfExtratoHandler,
  getQrCodeHandler,
  handleWhatsAppWebhookHandler,
} from "./finia.controller";

export async function finiaRoutes(fastify: FastifyInstance) {
  // Rotas protegidas (JWT + tenantMiddleware)
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", tenantMiddleware);

    protectedRoutes.get("/dashboard", getDashboardHandler);
    protectedRoutes.post("/transacao", createTransactionHandler);
    protectedRoutes.post("/conta-fixa", createBillHandler);
    protectedRoutes.post("/divida", createDebtHandler);
    protectedRoutes.post("/upload-extrato", uploadPdfExtratoHandler);
    protectedRoutes.get("/qr-code", getQrCodeHandler);
  });

  // Webhook público da Evolution API (WhatsApp)
  fastify.post("/webhook/whatsapp/:tenantId", handleWhatsAppWebhookHandler);
  fastify.post("/webhook/whatsapp", handleWhatsAppWebhookHandler);
}
