import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env";
import { prisma } from "../core/database/prisma";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_MINUTE = 100;
const BURST_LIMIT = 5;
const BURST_WINDOW_SECONDS = 900;

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim() || request.ip;
  }
  return request.ip || "unknown";
}

async function loadAllowedOrigins(): Promise<string[]> {
  const originsFromDatabase = new Set<string>();

  try {
    const exists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT to_regclass('public.tenant_domains') IS NOT NULL AS exists
    `;

    if (exists[0]?.exists) {
      const rows = await prisma.$queryRaw<Array<{ origin: string }>>`
        SELECT origin
        FROM public.tenant_domains
        WHERE is_active = true
      `;

      for (const row of rows) {
        if (row.origin) {
          originsFromDatabase.add(row.origin.trim());
        }
      }
    }
  } catch {
    // Sem tabela de domínios, cai para fallback seguro sem quebrar boot.
  }

  const envOrigins = env.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of envOrigins) {
    originsFromDatabase.add(origin);
  }

  if (env.NODE_ENV === "development") {
    originsFromDatabase.add("http://localhost:3000");
    originsFromDatabase.add("http://localhost:3001");
    originsFromDatabase.add("http://localhost:5050");
  }

  return [...originsFromDatabase];
}

export async function securityPlugin(app: FastifyInstance): Promise<void> {
  const redisClient: RedisClientType = createClient({
    url: env.REDIS_CENTRAL_URL,
  });

  redisClient.on("error", (error) => {
    app.log.warn({ err: error }, "Redis central indisponível; rate-limit em fallback local");
  });

  try {
    await redisClient.connect();
  } catch (error) {
    app.log.warn({ err: error }, "Redis central não respondeu; mantendo servidor em modo degradado");
  }

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production"
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        }
      : false,
    hsts: env.NODE_ENV === "production"
      ? { maxAge: 63_072_000, includeSubDomains: true, preload: true }
      : false,
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(cors, {
    origin: async (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = await loadAllowedOrigins();
      const isAllowed = allowedOrigins.includes(origin) || (
        env.NODE_ENV === "development" && /^https?:\/\/localhost(?::\d+)?$/.test(origin)
      );

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: origem não permitida: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "Accept",
      "X-Requested-With",
      "X-Webhook-Token",
      "X-App-Version",
      "X-Tenant-Id",
      "X-Request-Id",
    ],
    exposedHeaders: ["X-Request-Id", "Content-Disposition"],
    maxAge: 86_400,
  });

  app.addHook("onRequest", async (request, reply) => {
    const requestId =
      (typeof request.headers["x-request-id"] === "string" && request.headers["x-request-id"])
        ? request.headers["x-request-id"]
        : crypto.randomUUID();

    request.headers["x-request-id"] = requestId;
    reply.header("x-request-id", requestId);
  });

  app.addHook("preHandler", async (request, reply) => {
    const tenantId =
      (typeof request.headers["x-tenant-id"] === "string" && request.headers["x-tenant-id"])
        ? request.headers["x-tenant-id"]
        : request.user?.tenantId ?? "public";

    const ip = getClientIp(request);
    const minuteKey = `rate:${tenantId}:${ip}:minute`;
    const burstKey = `rate:${tenantId}:${ip}:burst`;

    try {
      const minuteHits = await redisClient.incr(minuteKey);
      if (minuteHits === 1) {
        await redisClient.expire(minuteKey, WINDOW_SECONDS);
      }

      if (minuteHits > MAX_REQUESTS_PER_MINUTE) {
        await redisClient.set(minuteKey, String(MAX_REQUESTS_PER_MINUTE), { EX: WINDOW_SECONDS });
        return reply.code(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Limite de requisições por tenant excedido.",
        });
      }

      const burstHits = await redisClient.incr(burstKey);
      if (burstHits === 1) {
        await redisClient.expire(burstKey, BURST_WINDOW_SECONDS);
      }

      if (burstHits > BURST_LIMIT && minuteHits > MAX_REQUESTS_PER_MINUTE / 2) {
        await redisClient.set(burstKey, String(BURST_LIMIT), { EX: BURST_WINDOW_SECONDS });
        return reply.code(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Bloqueado por excesso de requisições. Tente novamente em 15 minutos.",
        });
      }
    } catch (error) {
      app.log.warn({ err: error }, "Rate-limit Redis indisponível; requisição liberada em fallback");
    }
  });
}
