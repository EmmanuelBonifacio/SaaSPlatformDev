/**
 * Validação pura de anexos de comments (sem I/O / sem env).
 */

import {
  extensionForImageMime,
  isImageBufferConsistentWithMime,
  MAX_IMAGE_UPLOAD_BYTES,
} from "../../core/security/image-upload";
import { AgentsModuleError } from "./agents.errors";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_COMMENT = 5;

export type AttachmentKind = "image" | "file" | "receipt";

function isPdf(buffer: Buffer, mime: string): boolean {
  if (mime !== "application/pdf") return false;
  return (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

export function assertAttachmentQuota(currentCount: number): void {
  if (currentCount >= MAX_ATTACHMENTS_PER_COMMENT) {
    throw new AgentsModuleError(
      400,
      `Máximo de ${MAX_ATTACHMENTS_PER_COMMENT} anexos por comentário.`,
    );
  }
}

export function validateAttachmentBuffer(input: {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}): {
  kind: Exclude<AttachmentKind, "receipt">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ext: string;
} {
  const mime = input.mimetype.toLowerCase().trim();
  const safeName = input.filename.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);
  const imageExt = extensionForImageMime(mime);

  if (imageExt) {
    if (input.buffer.length > MAX_IMAGE_UPLOAD_BYTES) {
      throw new AgentsModuleError(400, "Imagem excede 3MB.");
    }
    if (!isImageBufferConsistentWithMime(input.buffer, mime)) {
      throw new AgentsModuleError(400, "Conteúdo da imagem não bate com o MIME.");
    }
    return {
      kind: "image",
      filename: safeName || `image${imageExt}`,
      mimeType: mime,
      sizeBytes: input.buffer.length,
      ext: imageExt,
    };
  }

  if (mime === "application/pdf") {
    if (input.buffer.length > MAX_PDF_BYTES) {
      throw new AgentsModuleError(400, "PDF excede 5MB.");
    }
    if (!isPdf(input.buffer, mime)) {
      throw new AgentsModuleError(400, "Arquivo PDF inválido.");
    }
    return {
      kind: "file",
      filename: safeName || "file.pdf",
      mimeType: mime,
      sizeBytes: input.buffer.length,
      ext: ".pdf",
    };
  }

  throw new AgentsModuleError(
    400,
    "MIME não permitido (use jpeg/png/webp/gif ou pdf).",
  );
}
