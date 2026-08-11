// =============================================================================
// src/utils/validate.ts
// =============================================================================
// Helper para validação de body/query/params com Zod em rotas Fastify.
// Centraliza a lógica de erro para não repetir boilerplate em cada handler.
// =============================================================================

import { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";

// Retorna apenas informações de validação — nunca o body completo ou stack
function formatZodError(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({
        statusCode: 400,
        error: "Validation Error",
        issues: formatZodError(result.error),
      });
      return;
    }
    // Substituir body pelo dado validado e sanitizado pelo Zod
    // (strips campos extras, aplica .trim(), .toLowerCase(), etc.)
    request.body = result.data as FastifyRequest["body"];
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      reply.status(400).send({
        statusCode: 400,
        error: "Validation Error",
        issues: formatZodError(result.error),
      });
      return;
    }
    request.query = result.data as FastifyRequest["query"];
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      reply.status(400).send({
        statusCode: 400,
        error: "Validation Error",
        issues: formatZodError(result.error),
      });
      return;
    }
    request.params = result.data as FastifyRequest["params"];
  };
}
