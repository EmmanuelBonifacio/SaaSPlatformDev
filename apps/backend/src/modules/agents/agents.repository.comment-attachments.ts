import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import type { CommentAttachmentRecord } from "./agents.types";

type AttachmentRow = Omit<CommentAttachmentRecord, "createdAt"> & {
  createdAt: Date;
};

function mapAttachment(row: AttachmentRow): CommentAttachmentRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAttachmentsForComments(
  schemaName: string,
  commentIds: string[],
): Promise<Map<string, CommentAttachmentRecord[]>> {
  const result = new Map<string, CommentAttachmentRecord[]>();
  if (commentIds.length === 0) return result;
  const { Prisma } = await import("@prisma/client");
  const idList = Prisma.join(
    commentIds.map((id) => Prisma.sql`${id}::uuid`),
  );
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AttachmentRow[]>`
      SELECT id, comment_id AS "commentId", kind, filename,
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        url_path AS "urlPath",
        amount_cents AS "amountCents",
        currency, note,
        created_at AS "createdAt"
      FROM agent_task_comment_attachments
      WHERE comment_id IN (${idList})
      ORDER BY created_at ASC
    `,
  );
  for (const row of rows) {
    const mapped = mapAttachment(row);
    const list = result.get(mapped.commentId) ?? [];
    list.push(mapped);
    result.set(mapped.commentId, list);
  }
  return result;
}

export async function countAttachments(
  schemaName: string,
  commentId: string,
): Promise<number> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM agent_task_comment_attachments
      WHERE comment_id = ${commentId}::uuid
    `,
  );
  return Number(rows[0]?.c ?? 0);
}

export async function insertFileAttachment(
  schemaName: string,
  commentId: string,
  input: {
    kind: "image" | "file";
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    urlPath: string;
  },
): Promise<CommentAttachmentRecord> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AttachmentRow[]>`
      INSERT INTO agent_task_comment_attachments (
        comment_id, kind, filename, mime_type, size_bytes,
        storage_path, url_path
      ) VALUES (
        ${commentId}::uuid, ${input.kind}, ${input.filename},
        ${input.mimeType}, ${input.sizeBytes},
        ${input.storagePath}, ${input.urlPath}
      )
      RETURNING id, comment_id AS "commentId", kind, filename,
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        url_path AS "urlPath",
        amount_cents AS "amountCents",
        currency, note,
        created_at AS "createdAt"
    `,
  );
  return mapAttachment(rows[0]);
}

export async function insertReceiptAttachment(
  schemaName: string,
  commentId: string,
  input: {
    amountCents: number;
    currency: string;
    note?: string | null;
    filename?: string;
  },
): Promise<CommentAttachmentRecord> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AttachmentRow[]>`
      INSERT INTO agent_task_comment_attachments (
        comment_id, kind, filename, amount_cents, currency, note
      ) VALUES (
        ${commentId}::uuid, 'receipt',
        ${input.filename ?? "receipt"},
        ${input.amountCents},
        ${input.currency.toUpperCase().slice(0, 3)},
        ${input.note ?? null}
      )
      RETURNING id, comment_id AS "commentId", kind, filename,
        mime_type AS "mimeType",
        size_bytes AS "sizeBytes",
        url_path AS "urlPath",
        amount_cents AS "amountCents",
        currency, note,
        created_at AS "createdAt"
    `,
  );
  return mapAttachment(rows[0]);
}

export async function assertCommentOnTask(
  schemaName: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM agent_task_comments
      WHERE id = ${commentId}::uuid AND task_id = ${taskId}::uuid
      LIMIT 1
    `,
  );
  if (!rows[0]) {
    throw new AgentsModuleError(404, "Comentário não encontrado nesta tarefa.");
  }
}
