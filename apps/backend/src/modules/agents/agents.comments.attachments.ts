/**
 * Persistência de anexos de comments (SP-44).
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import {
  assertAttachmentQuota,
  validateAttachmentBuffer,
  type AttachmentKind,
} from "./agents.comments.attachments.core";

export {
  assertAttachmentQuota,
  MAX_ATTACHMENTS_PER_COMMENT,
  MAX_PDF_BYTES,
  validateAttachmentBuffer,
  type AttachmentKind,
} from "./agents.comments.attachments.core";

function uploadsRoot(): string {
  return path.isAbsolute(env.UPLOADS_DIR)
    ? env.UPLOADS_DIR
    : path.resolve(process.cwd(), env.UPLOADS_DIR);
}

export async function persistCommentAttachmentFile(input: {
  schemaName: string;
  taskId: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}): Promise<{
  kind: Exclude<AttachmentKind, "receipt">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  urlPath: string;
}> {
  const validated = validateAttachmentBuffer(input);
  const id = randomUUID();
  const relative = path.posix.join(
    "agents",
    input.schemaName.replace(/[^a-zA-Z0-9_]/g, "_"),
    input.taskId,
    `${id}${validated.ext}`,
  );
  const absolute = path.join(uploadsRoot(), ...relative.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, input.buffer);

  return {
    kind: validated.kind,
    filename: validated.filename,
    mimeType: validated.mimeType,
    sizeBytes: validated.sizeBytes,
    storagePath: absolute,
    urlPath: `/uploads/${relative}`,
  };
}
