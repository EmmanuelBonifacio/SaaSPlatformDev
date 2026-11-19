// =============================================================================
// src/config/env.ts
// =============================================================================
// Validação de variáveis de ambiente na inicialização.
// Se qualquer variável obrigatória estiver ausente ou inválida, o servidor
// NÃO sobe — falha rápida (fail-fast) antes de aceitar qualquer requisição.
//
// Por que Zod aqui?
//   Runtime safety: TypeScript só checa em compile-time. Em produção o código
//   compilado roda sem tipos. Zod garante que os valores reais no processo
//   em execução são válidos, não só os tipos no código.
// =============================================================================

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),

  // ── Banco de dados ─────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),

  // ── JWT — tamanho mínimo 64 chars (512 bits de entropia) ──────────────────
  // Gerar com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  JWT_SECRET: z
    .string()
    .min(64, "JWT_SECRET deve ter no mínimo 64 caracteres (use crypto.randomBytes(64))"),

  JWT_REFRESH_SECRET: z
    .string()
    .min(64, "JWT_REFRESH_SECRET deve ter no mínimo 64 caracteres"),

  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Domínios separados por vírgula, ex: "https://app.com,https://admin.app.com"
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),

  REDIS_CENTRAL_URL: z.string().default("redis://localhost:6379"),

  // ── Legacy (mantido por compatibilidade com socket.io config) ─────────────
  FRONTEND_URL: z.string().optional(),

  // ── Bcrypt — nunca abaixo de 12 em produção ───────────────────────────────
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).default(12),

  // ── Uploads ───────────────────────────────────────────────────────────────
  UPLOADS_DIR: z.string().default("/uploads"),

  // ── Push notifications ────────────────────────────────────────────────────
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // ── Monitoramento (opcional) ──────────────────────────────────────────────
  SENTRY_DSN: z.string().optional(),

  // ── FinIA & IA (Claude 3.5 Sonnet + Evolution API WhatsApp) ────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  // Codex/OpenAI harness (SP-35) — opcional; secret refs do agente têm precedência
  OPENAI_API_KEY: z.string().optional(),
  EVOLUTION_API_HOST: z.string().default("http://localhost:8080"),
  EVOLUTION_API_KEY: z.string().default("saas_evolution_secret"),

  // SP-40 — chave AES-256 para tokens OAuth MCP (hex 64 ou base64 32 bytes).
  // Obrigatória em produção ao persistir tokens; em dev deriva de JWT_SECRET.
  AGENTS_OAUTH_ENCRYPTION_KEY: z.string().min(32).optional(),

  // Agentes: runtime nativo em /agents (SP-7). PAPERCLIP_API_URL removido na fase 5.

  // Platform Cardápio (repo Platform-Card-pio) — opcional até o serviço estar no ar
  PLATFORM_CARDAPIO_API_URL: z.string().url().optional(),
  PLATFORM_CARDAPIO_WEBHOOK_SECRET: z.string().min(16).optional(),
  PLATFORM_CARDAPIO_SHARED_SECRET: z.string().min(32).optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Log estruturado antes de sair (pino ainda não está inicializado)
    console.error("❌ [env.ts] Variáveis de ambiente inválidas ou ausentes:");
    result.error.issues.forEach((issue) => {
      console.error(`   · ${issue.path.join(".")}: ${issue.message}`);
    });
    console.error(
      "\n💡 Copie apps/backend/.env.example para apps/backend/.env e preencha os valores.\n",
    );
    process.exit(1);
  }

  // Validação adicional: os dois secrets JWT não podem ser iguais
  if (result.data.JWT_SECRET === result.data.JWT_REFRESH_SECRET) {
    console.error(
      "❌ [env.ts] JWT_SECRET e JWT_REFRESH_SECRET devem ser DIFERENTES.\n" +
        "   Usar o mesmo secret permite que refresh tokens sejam aceitos como access tokens.",
    );
    process.exit(1);
  }

  // Avisar se bcrypt rounds < 12 em produção
  if (
    result.data.NODE_ENV === "production" &&
    result.data.BCRYPT_ROUNDS < 12
  ) {
    console.error(
      "❌ [env.ts] BCRYPT_ROUNDS < 12 não é permitido em produção.\n" +
        "   Abaixo de 12 rounds o hash de senha pode ser quebrado por brute force.",
    );
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
