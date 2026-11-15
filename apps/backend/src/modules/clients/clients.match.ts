import { ClientsModuleError } from "./clients.errors";

/** Normaliza documento para só dígitos. */
export function normalizeDocument(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Nome estável para chave quando não há CNPJ/CPF. */
export function normalizeClientName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Chave única anti-duplicata:
 * - com CNPJ/CPF (≥11 dígitos) → doc:{digits}
 * - senão → name:{nome normalizado}
 */
export function buildClientMatchKey(input: {
  cnpjCpf?: string | null;
  nomeFantasia: string;
}): string {
  const digits = normalizeDocument(input.cnpjCpf);
  if (digits.length >= 11) {
    return `doc:${digits}`;
  }
  const name = normalizeClientName(input.nomeFantasia);
  if (name.length < 2) {
    throw new ClientsModuleError(
      400,
      "Informe CNPJ/CPF válido ou um nome fantasia com ao menos 2 caracteres.",
    );
  }
  return `name:${name}`;
}
