import { FastifyRequest, FastifyReply } from "fastify";

type Role = "user" | "admin" | "superadmin";

const HIERARCHY: Record<Role, number> = { user: 1, admin: 2, superadmin: 3 };

/**
 * Exige que o usuário autenticado tenha pelo menos o role especificado.
 * Deve ser aplicado APÓS o tenantMiddleware (que popula request.user).
 *
 * Uso: preHandler: [tenantMiddleware, requireModule("x"), requireRole("admin")]
 */
export function requireRole(minRole: Role) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const userRole = (request.user?.role ?? "user") as Role;
    const userLevel = HIERARCHY[userRole] ?? 1;
    const requiredLevel = HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Proibido",
        message: "Requer perfil de administrador para esta operação.",
      });
    }
  };
}
