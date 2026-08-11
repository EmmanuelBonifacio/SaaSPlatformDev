// =============================================================================
// src/config/logger.ts
// =============================================================================
// Logger estruturado com redação automática de dados sensíveis.
//
// Por que não usar console.log direto?
//   - console.log não tem redação de dados sensíveis
//   - Sem formato estruturado (JSON) é impossível indexar em Datadog/Grafana
//   - Sem nível de log não dá para silenciar em testes
//
// Regra de ouro: NUNCA logar tokens, senhas, CPF, cartão ou dados pessoais.
// =============================================================================

import { env } from "./env";

// Campos cujos valores devem ser substituídos por '[REDACTED]'
const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "password_hash",
  "senha_hash",
  "hash",
  "token",
  "accessToken",
  "refreshToken",
  "access_token",
  "refresh_token",
  "token_hash",
  "jwt",
  "authorization",
  "cookie",
  "secret",
  "cpf",
  "rg",
  "cnpj",
  "cardNumber",
  "cvv",
  "numeroCartao",
  "apiKey",
  "api_key",
  "privateKey",
  "private_key",
  "key",
  "pin",
  "otp",
]);

function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redactSensitive(value, depth + 1),
    ]),
  );
}

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, msg: string, data?: unknown): void {
  if (env.NODE_ENV === "test") return;

  const entry: Record<string, unknown> = {
    level,
    msg,
    ts: new Date().toISOString(),
  };

  if (data !== undefined) {
    entry.data = redactSensitive(data);
  }

  const line = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => {
    if (env.NODE_ENV !== "development") return;
    log("debug", msg, data);
  },
  info: (msg: string, data?: unknown) => log("info", msg, data),
  warn: (msg: string, data?: unknown) => log("warn", msg, data),
  error: (msg: string, err?: unknown) => {
    const safeErr =
      err instanceof Error
        ? {
            message: err.message,
            // Stack trace apenas em desenvolvimento — nunca expor em produção
            stack: env.NODE_ENV === "development" ? err.stack : undefined,
          }
        : redactSensitive(err);
    log("error", msg, safeErr);
  },
};
