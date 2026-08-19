// =============================================================================
// src/modules/finia/finia.controller.ts
// =============================================================================
// Controller HTTP do módulo FinIA
// =============================================================================

import type { FastifyRequest, FastifyReply } from "fastify";
import { finiaService } from "./finia.service";
import {
  createTransactionSchema,
  createBillSchema,
  createDebtSchema,
} from "./finia.schema";

export async function getDashboardHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantIdentifier = request.tenant!.schemaName || request.tenant!.slug || request.tenant!.id;
  const query = request.query as { month?: string; year?: string };
  const month = query.month ? parseInt(query.month, 10) : undefined;
  const year = query.year ? parseInt(query.year, 10) : undefined;

  const summary = await finiaService.getDashboardSummary(tenantIdentifier, month, year);
  return reply.code(200).send(summary);
}

export async function createTransactionHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantIdentifier = request.tenant!.schemaName || request.tenant!.slug || request.tenant!.id;
  const dto = createTransactionSchema.parse(request.body);

  const transaction = await finiaService.createTransaction(tenantIdentifier, dto);
  return reply.code(201).send(transaction);
}

export async function createBillHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantIdentifier = request.tenant!.schemaName || request.tenant!.slug || request.tenant!.id;
  const dto = createBillSchema.parse(request.body);

  const bill = await finiaService.createBill(tenantIdentifier, dto);
  return reply.code(201).send(bill);
}

export async function createDebtHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantIdentifier = request.tenant!.schemaName || request.tenant!.slug || request.tenant!.id;
  const dto = createDebtSchema.parse(request.body);

  const debt = await finiaService.createDebt(tenantIdentifier, dto);
  return reply.code(201).send(debt);
}

export async function uploadPdfExtratoHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantIdentifier = request.tenant!.schemaName || request.tenant!.slug || request.tenant!.id;
  const data = await request.file();

  if (!data) {
    return reply.status(400).send({ error: "Nenhum arquivo enviado" });
  }

  const buffer = await data.toBuffer();
  const result = await finiaService.processPdfBuffer(tenantIdentifier, buffer);

  return reply.code(200).send({
    message: `Extrato processado com sucesso! ${result.transactionsCreated} transações importadas.`,
    transactions: result.items,
  });
}

export async function getQrCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantIdentifier = request.tenant!.schemaName || request.tenant!.slug || request.tenant!.id;
  const qr = await finiaService.getWhatsAppQrCode(tenantIdentifier);
  return reply.code(200).send(qr);
}

export async function handleWhatsAppWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = (request.params as any).tenantId || "default";
  const body = request.body as any;

  const result = await finiaService.handleWhatsAppWebhook(tenantId, body);
  return reply.code(200).send({ status: "processed", reply: result });
}
