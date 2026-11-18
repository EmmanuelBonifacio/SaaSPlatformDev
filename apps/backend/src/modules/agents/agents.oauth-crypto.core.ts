/**
 * Primitivas AES-256-GCM (sem dependência de env) — SP-40.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AgentsModuleError } from "./agents.errors";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
export const OAUTH_KEY_BYTES = 32;

/** Envelope: base64url(iv).base64url(tag).base64url(ciphertext) */
export function encryptWithKey(plaintext: string, key: Buffer): string {
  if (key.length !== OAUTH_KEY_BYTES) {
    throw new AgentsModuleError(500, "Chave OAuth deve ter 32 bytes.");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptWithKey(envelope: string, key: Buffer): string {
  const parts = envelope.split(".");
  if (parts.length !== 3) {
    throw new AgentsModuleError(500, "Envelope de token OAuth inválido.");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

export function tokenPresence(value: string | null | undefined): boolean {
  return Boolean(value && value.length > 0);
}
