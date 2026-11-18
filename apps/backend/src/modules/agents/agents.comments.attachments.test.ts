import { describe, expect, it } from "vitest";
import {
  assertAttachmentQuota,
  validateAttachmentBuffer,
} from "./agents.comments.attachments.core";
import { AgentsModuleError } from "./agents.errors";
import {
  createCommentReceiptSchema,
  createCommentSchema,
} from "./agents.schema";

describe("comment attachments / receipts schemas", () => {
  it("aceita comment com receipt opcional e body até 8000", () => {
    expect(
      createCommentSchema.safeParse({
        body: "ok",
        receipt: { amountCents: 1500, currency: "brl", note: "taxi" },
      }).success,
    ).toBe(true);
    expect(
      createCommentSchema.safeParse({ body: "x".repeat(8001) }).success,
    ).toBe(false);
    expect(
      createCommentReceiptSchema.safeParse({
        amountCents: -1,
        currency: "USD",
      }).success,
    ).toBe(false);
  });

  it("limita quota de anexos", () => {
    expect(() => assertAttachmentQuota(5)).toThrow(AgentsModuleError);
    expect(() => assertAttachmentQuota(4)).not.toThrow();
  });

  it("rejeita MIME não permitido", () => {
    expect(() =>
      validateAttachmentBuffer({
        filename: "x.exe",
        mimetype: "application/octet-stream",
        buffer: Buffer.from("MZ"),
      }),
    ).toThrow(AgentsModuleError);
  });

  it("rejeita imagem com magic bytes inconsistentes", () => {
    expect(() =>
      validateAttachmentBuffer({
        filename: "fake.png",
        mimetype: "image/png",
        buffer: Buffer.from("not-a-png-file!!!!"),
      }),
    ).toThrow(AgentsModuleError);
  });

  it("aceita PNG com assinatura válida", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    const result = validateAttachmentBuffer({
      filename: "ok.png",
      mimetype: "image/png",
      buffer: png,
    });
    expect(result.kind).toBe("image");
    expect(result.ext).toBe(".png");
  });
});
