// =============================================================================
// src/core/types/fastify.d.ts
// =============================================================================
// Augmenta Fastify / @fastify/jwt com tenant e claims do JWT.
// =============================================================================

import "fastify";
import "@fastify/jwt";

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
}

declare module "fastify" {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      tenantId: string;
      role: string;
      name?: string;
    };
    user: {
      sub: string;
      tenantId: string;
      role: string;
      name?: string;
    };
  }
}
