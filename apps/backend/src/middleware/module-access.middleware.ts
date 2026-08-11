// =============================================================================
// src/middleware/module-access.middleware.ts
// =============================================================================
// Fábrica de preHandlers para proteger rotas por módulo.
//
// Uso:
//   fastify.get('/frota/rotas', {
//     preHandler: [tenantMiddleware, requireModule('fleet')],
//   }, handler)
// =============================================================================

import { FastifyRequest, FastifyReply } from "fastify";
import { getTenantVisibleModules } from "../modules/tenant/tenant.modules.service";

export function requireModule(moduleSlug: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Token inválido." });
      return;
    }

    const modules = await getTenantVisibleModules(tenantId);
    const mod = modules.find((m) => m.name === moduleSlug);

    if (!mod) {
      reply.status(403).send({
        statusCode: 403,
        error: "Module Not Available",
        message: "Este módulo não está disponível no seu plano.",
        moduleSlug,
      });
      return;
    }

    if (!mod.ativo) {
      reply.status(403).send({
        statusCode: 403,
        error: "Module Disabled",
        message: "Este módulo está desativado para sua conta.",
        moduleSlug,
      });
      return;
    }

    if (mod.trialExpirado) {
      reply.status(402).send({
        statusCode: 402,
        error: "Trial Expired",
        message: "O período de teste deste módulo expirou. Faça upgrade do seu plano.",
        moduleSlug,
      });
      return;
    }
  };
}
