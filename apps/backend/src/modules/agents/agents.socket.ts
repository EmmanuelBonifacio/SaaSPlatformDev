/**
 * Socket.IO live para agentes (SP-36).
 * Namespace `/agents`; room = schema do tenant derivado do JWT (nunca do client).
 */

import type { FastifyInstance } from "fastify";
import { Server as SocketServer, type Namespace, type Socket } from "socket.io";
import { env } from "../../config/env";
import { prisma } from "../../core/database/prisma";
import { getLiveDashboard } from "./agents.repository.runner";
import type { LiveDashboard, RunRecord } from "./agents.types";

type AgentsSocketData = {
  tenantId: string;
  schemaName: string;
  userId: string;
};

type JwtPayload = {
  sub?: string;
  tenantId?: string;
};

let agentsNamespace: Namespace | null = null;

function roomForSchema(schemaName: string): string {
  return `schema:${schemaName}`;
}

function extractToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as { token?: unknown } | undefined;
  if (typeof auth?.token === "string" && auth.token.trim()) {
    return auth.token.trim();
  }
  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim() || null;
  }
  const queryToken = socket.handshake.query.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

function allowedOrigins(): string[] {
  const origins = env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.NODE_ENV === "development") {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    );
  }
  if (env.FRONTEND_URL) origins.push(env.FRONTEND_URL);
  return [...new Set(origins)];
}

async function assertAgentsModule(tenantId: string): Promise<boolean> {
  const active = await prisma.tenantModule.findFirst({
    where: {
      tenantId,
      module: { name: "agents" },
      isEnabled: true,
    },
    select: { id: true },
  });
  return Boolean(active);
}

export function registerAgentsSocket(app: FastifyInstance): Namespace {
  const io = new SocketServer(app.server, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigins(),
      credentials: true,
    },
  });

  const nsp = io.of("/agents");
  agentsNamespace = nsp;

  nsp.use((socket, next) => {
    void (async () => {
      try {
        const token = extractToken(socket);
        if (!token) {
          next(new Error("Unauthorized"));
          return;
        }
        const payload = app.jwt.verify<JwtPayload>(token);
        const tenantId = payload.tenantId;
        const userId = payload.sub;
        if (!tenantId || !userId) {
          next(new Error("Unauthorized"));
          return;
        }
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            schemaName: true,
            isActive: true,
          },
        });
        if (!tenant || !tenant.isActive) {
          next(new Error("Forbidden"));
          return;
        }
        if (!(await assertAgentsModule(tenant.id))) {
          next(new Error("Forbidden"));
          return;
        }
        (socket.data as AgentsSocketData).tenantId = tenant.id;
        (socket.data as AgentsSocketData).schemaName = tenant.schemaName;
        (socket.data as AgentsSocketData).userId = userId;
        next();
      } catch {
        next(new Error("Unauthorized"));
      }
    })();
  });

  nsp.on("connection", (socket) => {
    const data = socket.data as AgentsSocketData;
    const room = roomForSchema(data.schemaName);
    void socket.join(room);
    void emitAgentsLive(data.schemaName);

    socket.on("live:subscribe", () => {
      void emitAgentsLive(data.schemaName);
    });

    socket.on("disconnect", () => {
      // room leave is automatic
    });
  });

  app.log.info("Socket.IO /agents namespace registrado");
  return nsp;
}

export async function emitAgentsLive(schemaName: string): Promise<void> {
  if (!agentsNamespace) return;
  try {
    const live = await getLiveDashboard(schemaName);
    agentsNamespace.to(roomForSchema(schemaName)).emit("live:update", live);
  } catch {
    // best-effort; runner não deve falhar por socket
  }
}

export async function emitRunEvent(
  schemaName: string,
  event: "run:heartbeat" | "run:finished" | "run:started",
  run: Pick<
    RunRecord,
    "id" | "agentId" | "taskId" | "status" | "adapterType" | "summary" | "heartbeatAt"
  > & { phase?: string },
): Promise<void> {
  if (!agentsNamespace) return;
  agentsNamespace.to(roomForSchema(schemaName)).emit(event, run);
  await emitAgentsLive(schemaName);
}

export function getAgentsNamespace(): Namespace | null {
  return agentsNamespace;
}

export type { LiveDashboard };
