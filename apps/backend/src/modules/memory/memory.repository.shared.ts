import { Prisma } from "@prisma/client";
import type {
  MemoryCategory,
  MemoryRecord,
  MemoryScope,
  MemorySource,
} from "./memory.types";

export interface MemoryRow {
  id: string;
  ownerUserId: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  title: string;
  content: string;
  status: "draft" | "approved";
  sourceType: MemorySource;
  createdBy: string;
  reviewedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export const MEMORY_COLUMNS = Prisma.sql`
  id,
  owner_user_id AS "ownerUserId",
  scope,
  category,
  title,
  content,
  status,
  source_type AS "sourceType",
  created_by AS "createdBy",
  reviewed_by AS "reviewedBy",
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  expires_at AS "expiresAt"
`;

export function mapMemory(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    scope: row.scope,
    category: row.category,
    title: row.title,
    content: row.content,
    status: row.status,
    sourceType: row.sourceType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };
}

export type MemoryEventAction =
  | "candidate_created"
  | "candidate_approved"
  | "candidate_rejected"
  | "candidate_expired"
  | "memory_deleted"
  | "capture_setting_changed";

export async function writeMemoryEvent(
  tx: Prisma.TransactionClient,
  input: {
    memoryId: string | null;
    actorUserId: string;
    scope: MemoryScope;
    action: MemoryEventAction;
  },
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO agent_memory_events (memory_id, actor_user_id, scope, action)
    VALUES (${input.memoryId}::uuid, ${input.actorUserId}, ${input.scope}, ${input.action})
  `;
}

export async function getActiveUserRole(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<string | null> {
  const rows = await tx.$queryRaw<Array<{ role: string }>>`
    SELECT role
    FROM users
    WHERE id = ${userId}::uuid AND is_active = true
    LIMIT 1
  `;
  return rows[0]?.role ?? null;
}
