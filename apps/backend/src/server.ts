// =============================================================================
// src/server.ts — SaaS Core Server
// =============================================================================

import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { env } from "./config/env";
import fastifyStatic from "@fastify/static";
import { securityPlugin } from "./plugins/security";
import fastifyMultipart from "@fastify/multipart";
import path from "path";
import { disconnectPrisma } from "./core/database/prisma";
import { tenantMiddleware } from "./core/middleware/tenant.middleware";
import { provisionNewTenant } from "./core/tenant/tenant.provisioner";
import { adminRoutes } from "./admin/admin.routes";
import { adminAuthRoutes } from "./admin/admin.auth.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { finiaRoutes } from "./modules/finia/finia.routes";
import { registerRequestLoggerHook } from "./core/middleware/request-logger.hook";
import {
  getTenantVisibleModules,
  getTenantPlano,
} from "./modules/tenant/tenant.modules.service";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token", "*.secret"],
        censor: "[REDACTED]",
      },
    },
    bodyLimit: 5 * 1024 * 1024,
  });

  const jwtSecret = env.JWT_SECRET;

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: "access_token",
      signed: false,
    },
  });

  await app.register(securityPlugin);

  registerRequestLoggerHook(app);

  app.get("/health", async () => {
    const base = { status: "ok" as const, timestamp: new Date().toISOString() };
    if (env.NODE_ENV === "production") {
      return base;
    }
    return { ...base, environment: env.NODE_ENV };
  });

  if (env.NODE_ENV === "development") {
    app.post<{
      Body: { tenantId: string; userId: string; role?: string };
    }>("/dev/token", async (request, reply) => {
      const { tenantId, userId, role = "user" } = request.body;
      if (!tenantId || !userId) {
        return reply.status(400).send({ error: "tenantId e userId são obrigatórios" });
      }
      const token = app.jwt.sign(
        { sub: userId, tenantId, role },
        { expiresIn: env.JWT_EXPIRES_IN },
      );
      return reply.send({
        token,
        instruções: "Use este token no header: Authorization: Bearer <token>",
      });
    });
  }

  app.get(
    "/me",
    { preHandler: [tenantMiddleware] },
    async (request) => {
      const tenant = request.tenant!;
      return {
        mensagem: `Olá! Você está acessando o tenant: ${tenant.name}`,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          schemaName: tenant.schemaName,
        },
        usuario: {
          id: request.user.sub,
          role: request.user.role,
        },
      };
    },
  );

  await app.register(fastifyStatic, {
    root: path.join(__dirname, "../public"),
    prefix: "/static/",
    cacheControl: true,
    maxAge: "1h",
  });

  await app.register(fastifyStatic, {
    root: path.isAbsolute(env.UPLOADS_DIR)
      ? env.UPLOADS_DIR
      : path.resolve(__dirname, "..", env.UPLOADS_DIR),
    prefix: "/uploads/",
    cacheControl: true,
    maxAge: "10m",
    decorateReply: false,
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(finiaRoutes, { prefix: "/finia" });

  app.get(
    "/modules/status",
    { preHandler: [tenantMiddleware] },
    async (request, reply) => {
      const tenantId = request.tenant!.id;
      const modules = await getTenantVisibleModules(tenantId);
      return reply.status(200).send({ modules: modules.map((m) => m.name) });
    },
  );

  app.get(
    "/api/tenant/modules",
    { preHandler: [tenantMiddleware] },
    async (request, reply) => {
      const tenantId = request.tenant!.id;
      const [modules, plano] = await Promise.all([
        getTenantVisibleModules(tenantId),
        getTenantPlano(tenantId),
      ]);
      return reply.status(200).send({ modules, plano });
    },
  );

  await app.register(adminAuthRoutes, { prefix: "/admin" });
  await app.register(adminRoutes, { prefix: "/admin" });

  if (env.NODE_ENV === "development") {
    app.post<{
      Body: {
        name: string;
        slug: string;
        moduleNames?: string[];
      };
    }>("/dev/provisionar-tenant", async (request, reply) => {
      const { name, slug, moduleNames } = request.body;
      if (!name || !slug) {
        return reply.status(400).send({ error: "name e slug são obrigatórios" });
      }
      const schemaName = `tenant_${slug.toLowerCase().replace(/-/g, "_")}`;
      const tenant = await provisionNewTenant({
        name,
        slug,
        schemaName,
        moduleNames,
      });
      return reply.status(201).send({
        mensagem: `Tenant "${name}" provisionado com sucesso!`,
        tenant,
        proximoPasso: `Gere um token: POST /dev/token com { "tenantId": "${tenant.id}", "userId": "user-001" }`,
      });
    });
  }

  app.setErrorHandler((error, request, reply) => {
    const isZodError =
      error instanceof ZodError ||
      (error as unknown as { name?: string })?.name === "ZodError" ||
      Array.isArray((error as unknown as { issues?: unknown })?.issues);

    if (isZodError) {
      const zodErr = error as ZodError;
      request.log.warn(
        { issues: zodErr.issues },
        "Requisição rejeitada: validação Zod",
      );
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Dados de entrada inválidos.",
        issues: zodErr.issues ?? [],
      });
    }

    const statusCode = (error as FastifyError).statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, (error as Error).message);
    } else {
      request.log.info({ err: error }, (error as Error).message);
    }

    if (statusCode >= 500 && env.NODE_ENV === "production") {
      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Erro interno do servidor.",
      });
    }

    reply.send(error);
  });

  return app;
}

async function start() {
  const app = await buildServer();
  const port = env.PORT;

  try {
    await app.listen({ port, host: env.HOST });

    app.log.info(
      {
        port,
        env: env.NODE_ENV,
        modules: ["auth", "admin", "tenant"],
        ...(env.NODE_ENV === "development" && {
          devRoutes: ["POST /dev/token", "POST /dev/provisionar-tenant"],
        }),
      },
      `SaaS Core pronto em http://localhost:${port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM recebido. Encerrando graciosamente...");
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Server] SIGINT recebido (Ctrl+C). Encerrando...");
  await disconnectPrisma();
  process.exit(0);
});

start();
