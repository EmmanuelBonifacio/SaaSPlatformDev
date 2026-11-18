/**
 * Erros tipados para o painel agents (classificação a partir de Error/API).
 */

export type AgentsOpErrorCode =
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limit"
  | "unauthorized"
  | "network"
  | "unknown";

export type AgentsOpError = {
  code: AgentsOpErrorCode;
  message: string;
  statusCode?: number;
};

function statusFromUnknown(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as {
    statusCode?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  if (typeof record.statusCode === "number") return record.statusCode;
  if (typeof record.status === "number") return record.status;
  if (typeof record.response?.status === "number") return record.response.status;
  return undefined;
}

function classifyByStatus(status: number): AgentsOpErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limit";
  if (status >= 400 && status < 500) return "validation";
  return "unknown";
}

function classifyByMessage(message: string): AgentsOpErrorCode | null {
  if (/403|Forbidden|sem permiss|permiss/i.test(message)) return "forbidden";
  if (/401|não autentic|unauthorized|sessão/i.test(message)) return "unauthorized";
  if (/404|não encontrad|not found/i.test(message)) return "not_found";
  if (/409|conflito|já existe|duplicate|idempoten/i.test(message)) {
    return "conflict";
  }
  if (/429|rate.?limit|muitas requisi/i.test(message)) return "rate_limit";
  if (/timeout|network|ECONN|Failed to fetch|comunicação/i.test(message)) {
    return "network";
  }
  if (/valid|zod|obrigat|inválid|invalid|bad request|400/i.test(message)) {
    return "validation";
  }
  return null;
}

const DEFAULT_MESSAGES: Record<AgentsOpErrorCode, string> = {
  forbidden: "Sem permissão para esta operação.",
  not_found: "Recurso não encontrado.",
  validation: "Dados inválidos. Revise os campos e tente de novo.",
  conflict: "Conflito com o estado atual. Atualize e tente de novo.",
  rate_limit: "Muitas requisições. Aguarde um momento.",
  unauthorized: "Sessão expirada ou inválida. Faça login novamente.",
  network: "Falha de rede. Verifique a conexão e tente de novo.",
  unknown: "Não foi possível concluir a operação.",
};

/** Classifica erro de API/UI em código estável + mensagem amigável. */
export function toAgentsOpError(error: unknown): AgentsOpError {
  const statusCode = statusFromUnknown(error);
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const code =
    (statusCode != null ? classifyByStatus(statusCode) : null) ??
    classifyByMessage(rawMessage) ??
    "unknown";

  const message =
    rawMessage && code === "unknown"
      ? rawMessage
      : rawMessage && !/^\d{3}\b/.test(rawMessage)
        ? rawMessage
        : DEFAULT_MESSAGES[code];

  return { code, message: message || DEFAULT_MESSAGES[code], statusCode };
}

export function errorMessage(error: unknown): string {
  return toAgentsOpError(error).message;
}
