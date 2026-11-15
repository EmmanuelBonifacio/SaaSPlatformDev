import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { ZodError } from "zod";

const TEST_JWT_SECRET = "memory-integration-test-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function buildMemoryIntegrationServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(fastifyJwt, { secret: TEST_JWT_SECRET });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const isZodError =
      error instanceof ZodError ||
      error.name === "ZodError" ||
      ("issues" in error && Array.isArray(error.issues));
    const statusCode = isZodError ? 400 : error.statusCode ?? 500;
    return reply.status(statusCode).send({ statusCode });
  });
  const { memoryRoutes } = await import("./memory.routes");
  await app.register(memoryRoutes, { prefix: "/memory" });
  await app.ready();
  return app;
}
