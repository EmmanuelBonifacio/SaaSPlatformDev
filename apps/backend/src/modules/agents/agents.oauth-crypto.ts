/**
 * Criptografia at-rest para tokens OAuth MCP (AES-256-GCM).
 * Nunca logar plaintext; ciphertext é o único formato persistido.
 */

import { createHash } from "node:crypto";
import { env } from "../../config/env";
import { AgentsModuleError } from "./agents.errors";
import {
  decryptWithKey,
  encryptWithKey,
  OAUTH_KEY_BYTES,
  tokenPresence,
} from "./agents.oauth-crypto.core";

export { decryptWithKey, encryptWithKey, tokenPresence };

function resolveKey(): Buffer {
  const configured = env.AGENTS_OAUTH_ENCRYPTION_KEY?.trim();
  if (configured) {
    if (/^[0-9a-fA-F]{64}$/.test(configured)) {
      return Buffer.from(configured, "hex");
    }
    const asBuf = Buffer.from(configured, "base64");
    if (asBuf.length === OAUTH_KEY_BYTES) return asBuf;
    throw new AgentsModuleError(
      500,
      "AGENTS_OAUTH_ENCRYPTION_KEY inválida (hex 64 ou base64 32 bytes).",
    );
  }
  if (env.NODE_ENV === "production") {
    throw new AgentsModuleError(
      500,
      "AGENTS_OAUTH_ENCRYPTION_KEY obrigatória em produção.",
    );
  }
  return createHash("sha256")
    .update(`agents-oauth-tokens-v1:${env.JWT_SECRET}`)
    .digest();
}

export function encryptSecret(plaintext: string): string {
  return encryptWithKey(plaintext, resolveKey());
}

export function decryptSecret(envelope: string): string {
  return decryptWithKey(envelope, resolveKey());
}
