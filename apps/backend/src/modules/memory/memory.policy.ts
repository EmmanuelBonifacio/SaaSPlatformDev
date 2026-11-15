import type { MemoryScope } from "./memory.types";

export function canReadMemory(
  scope: MemoryScope,
  ownerUserId: string | null,
  actorUserId: string,
): boolean {
  return scope === "tenant" || ownerUserId === actorUserId;
}

export function canReviewMemory(
  scope: MemoryScope,
  ownerUserId: string | null,
  actorUserId: string,
  actorRole: string,
): boolean {
  if (scope === "user") return ownerUserId === actorUserId;
  return actorRole === "admin";
}

export function containsLikelySecret(value: string): boolean {
  const patterns = [
    /-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/i,
    /\bBearer\s+[A-Za-z0-9._~+/-]{12,}/i,
    /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*["']?[^ \r\n"'`]{8,}/i,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
  ];
  return patterns.some((pattern) => pattern.test(value));
}
