import { withTenantSchema } from "../../core/database/prisma";
import { MemoryModuleError } from "./memory.errors";
import { canReviewMemory } from "./memory.policy";
import type { MemoryRecord } from "./memory.types";
import {
  MEMORY_COLUMNS,
  getActiveUserRole,
  mapMemory,
  writeMemoryEvent,
  type MemoryRow,
} from "./memory.repository.shared";

interface ExpiredMemoryRow {
  count: bigint;
}

export async function reviewCandidate(
  schemaName: string,
  memoryId: string,
  actorUserId: string,
  action: "approve" | "reject",
): Promise<MemoryRecord | null | false> {
  return withTenantSchema(schemaName, async (tx) => {
    const actorRole = await getActiveUserRole(tx, actorUserId);
    if (!actorRole) {
      throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
    }
    const [row] = await tx.$queryRaw<MemoryRow[]>`
      SELECT ${MEMORY_COLUMNS}
      FROM agent_memories
      WHERE id = ${memoryId}::uuid
        AND status = 'draft'
        AND expires_at > NOW()
      FOR UPDATE
    `;
    if (!row || !canReviewMemory(
      row.scope,
      row.ownerUserId,
      actorUserId,
      actorRole,
    )) {
      return false;
    }

    if (action === "reject") {
      await tx.$executeRaw`
        DELETE FROM agent_memories WHERE id = ${memoryId}::uuid
      `;
      await writeMemoryEvent(tx, {
        memoryId,
        actorUserId,
        scope: row.scope,
        action: "candidate_rejected",
      });
      return null;
    }

    const [approved] = await tx.$queryRaw<MemoryRow[]>`
      UPDATE agent_memories
      SET status = 'approved', reviewed_by = ${actorUserId},
          approved_at = NOW(), expires_at = NULL, updated_at = NOW()
      WHERE id = ${memoryId}::uuid
      RETURNING ${MEMORY_COLUMNS}
    `;
    await writeMemoryEvent(tx, {
      memoryId,
      actorUserId,
      scope: row.scope,
      action: "candidate_approved",
    });
    return mapMemory(approved);
  });
}

export async function deleteMemory(
  schemaName: string,
  memoryId: string,
  actorUserId: string,
): Promise<boolean> {
  return withTenantSchema(schemaName, async (tx) => {
    const actorRole = await getActiveUserRole(tx, actorUserId);
    if (!actorRole) {
      throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
    }
    const [row] = await tx.$queryRaw<MemoryRow[]>`
      SELECT ${MEMORY_COLUMNS}
      FROM agent_memories
      WHERE id = ${memoryId}::uuid AND status = 'approved'
      FOR UPDATE
    `;
    if (!row || !canReviewMemory(
      row.scope,
      row.ownerUserId,
      actorUserId,
      actorRole,
    )) {
      return false;
    }

    await tx.$executeRaw`
      DELETE FROM agent_memories WHERE id = ${memoryId}::uuid
    `;
    await writeMemoryEvent(tx, {
      memoryId,
      actorUserId,
      scope: row.scope,
      action: "memory_deleted",
    });
    return true;
  });
}

export async function cleanupExpiredCandidates(
  schemaName: string,
): Promise<number> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<ExpiredMemoryRow[]>`
      WITH expired AS (
        SELECT id, scope, created_by
        FROM agent_memories
        WHERE status = 'draft' AND expires_at <= NOW()
        ORDER BY expires_at
        LIMIT 500
        FOR UPDATE SKIP LOCKED
      ), deleted AS (
        DELETE FROM agent_memories AS memory
        USING expired
        WHERE memory.id = expired.id
        RETURNING memory.id, memory.scope, memory.created_by
      ), logged AS (
        INSERT INTO agent_memory_events (memory_id, actor_user_id, scope, action)
        SELECT id, created_by, scope, 'candidate_expired'
        FROM deleted
        RETURNING id
      )
      SELECT COUNT(*)::bigint AS count FROM logged
    `,
  );
  return Number(rows[0]?.count ?? 0n);
}
