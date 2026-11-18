import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptWithKey,
  encryptWithKey,
  tokenPresence,
} from "./agents.oauth-crypto.core";

describe("agents.oauth-crypto.core", () => {
  const key = createHash("sha256").update("test-oauth-key").digest();

  it("encrypt/decrypt round-trip e envelopes distintos", () => {
    const a = encryptWithKey("access-token-value", key);
    const b = encryptWithKey("access-token-value", key);
    expect(a).not.toEqual(b);
    expect(decryptWithKey(a, key)).toBe("access-token-value");
    expect(decryptWithKey(b, key)).toBe("access-token-value");
    expect(a.split(".")).toHaveLength(3);
  });

  it("rejeita envelope inválido", () => {
    expect(() => decryptWithKey("not-an-envelope", key)).toThrow();
  });

  it("rejeita chave com tamanho errado", () => {
    expect(() => encryptWithKey("x", randomBytes(16))).toThrow();
  });

  it("tokenPresence", () => {
    expect(tokenPresence("abc")).toBe(true);
    expect(tokenPresence("")).toBe(false);
    expect(tokenPresence(null)).toBe(false);
  });
});
