import { withTenantSchema } from "../../core/database/prisma";
import { MemoryModuleError } from "./memory.errors";
import { canReadMemory } from "./memory.policy";
import type {
  MemoryCategory,
  MemoryRecord,
  MemoryScope,
  MemorySource,
} from "./memory.types";
import {
  MEMORY_COLUMNS,
  mapMemory,
  getActiveUserRole,
  writeMemoryEvent,
  type MemoryRow,
} from "./memory.repository.shared";

interface MemorySettingsRow {
  captureSuggestions: boolean;
}

export async function getCaptureSetting(
  schemaName: string,
  userId: string,
): Promise<boolean> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    (async () => {
      if (!(await getActiveUserRole(tx, userId))) {
        throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
      }
      return tx.$queryRaw<MemorySettingsRow[]>`
        SELECT capture_suggestions AS "captureSuggestions"
        FROM agent_memory_settings
        WHERE user_id = ${userId}
        LIMIT 1
      `;
    })(),
  );
  return rows[0]?.captureSuggestions ?? false;
}

export async function updateCaptureSetting(
  schemaName: string,
  userId: string,
  enabled: boolean,
): Promise<void> {
  await withTenantSchema(schemaName, async (tx) => {
    if (!(await getActiveUserRole(tx, userId))) {
      throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
    }
    await tx.$executeRaw`
      INSERT INTO agent_memory_settings (user_id, capture_suggestions)
      VALUES (${userId}, ${enabled})
      ON CONFLICT (user_id) DO UPDATE
      SET capture_suggestions = EXCLUDED.capture_suggestions,
          updated_at = NOW()
    `;
    await writeMemoryEvent(tx, {
      memoryId: null,
      actorUserId: userId,
      scope: "user",
      action: "capture_setting_changed",
    });
  });
}

export async function createCandidate(
  schemaName: string,
  input: {
    ownerUserId: string | null;
    actorUserId: string;
    scope: MemoryScope;
    category: MemoryCategory;
    title: string;
    content: string;
    sourceType: MemorySource;
    sourceReference?: string;
  },
): Promise<MemoryRecord | null> {
  return withTenantSchema(schemaName, async (tx) => {
    const role = await getActiveUserRole(tx, input.actorUserId);
    if (!role) {
      throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
    }
    if (input.scope === "tenant" && role !== "admin") {
      throw new MemoryModuleError(
        403,
        "Somente um administrador pode sugerir memória compartilhada.",
      );
    }
    if (input.sourceType === "conversation") {
      const [settings] = await tx.$queryRaw<MemorySettingsRow[]>`
        SELECT capture_suggestions AS "captureSuggestions"
        FROM agent_memory_settings
        WHERE user_id = ${input.actorUserId}
        LIMIT 1
      `;
      if (!settings?.captureSuggestions) return null;
    }

    const [row] = await tx.$queryRaw<MemoryRow[]>`
      INSERT INTO agent_memories (
        owner_user_id, scope, category, title, content, status,
        source_type, source_reference, created_by, expires_at
      )
      VALUES (
        ${input.ownerUserId}, ${input.scope}, ${input.category},
        ${input.title}, ${input.content}, 'draft', ${input.sourceType},
        ${input.sourceReference ?? null}, ${input.actorUserId},
        NOW() + INTERVAL '30 days'
      )
      RETURNING ${MEMORY_COLUMNS}
    `;
    await writeMemoryEvent(tx, {
      memoryId: row.id,
      actorUserId: input.actorUserId,
      scope: input.scope,
      action: "candidate_created",
    });
    return mapMemory(row);
  });
}

export async function listMemories(
  schemaName: string,
  userId: string,
  input: { query?: string; limit: number; offset: number },
): Promise<MemoryRecord[]> {
  const rows = await withTenantSchema(schemaName, async (tx) => {
    if (!(await getActiveUserRole(tx, userId))) {
      throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
    }
    return input.query
      ? tx.$queryRaw<MemoryRow[]>`
          SELECT ${MEMORY_COLUMNS}
          FROM agent_memories
          WHERE status = 'approved'
            AND (
              scope = 'tenant'
              OR (scope = 'user' AND owner_user_id = ${userId})
            )
            AND to_tsvector('simple', title || ' ' || content)
              @@ plainto_tsquery('simple', ${input.query})
          ORDER BY ts_rank(
            to_tsvector('simple', title || ' ' || content),
            plainto_tsquery('simple', ${input.query})
          ) DESC, created_at DESC
          LIMIT ${input.limit} OFFSET ${input.offset}
        `
      : tx.$queryRaw<MemoryRow[]>`
          SELECT ${MEMORY_COLUMNS}
          FROM agent_memories
          WHERE status = 'approved'
            AND (
              scope = 'tenant'
              OR (scope = 'user' AND owner_user_id = ${userId})
            )
          ORDER BY created_at DESC
          LIMIT ${input.limit} OFFSET ${input.offset}
        `;
  });

  return rows
    .filter((row) => canReadMemory(row.scope, row.ownerUserId, userId))
    .map(mapMemory);
}

export async function listCandidates(
  schemaName: string,
  userId: string,
  limit: number,
): Promise<MemoryRecord[]> {
  const rows = await withTenantSchema(schemaName, async (tx) => {
    const role = await getActiveUserRole(tx, userId);
    if (!role) {
      throw new MemoryModuleError(401, "Usuário autenticado não está ativo.");
    }
    const isAdmin = role === "admin";
    return tx.$queryRaw<MemoryRow[]>`
      SELECT ${MEMORY_COLUMNS}
      FROM agent_memories
      WHERE status = 'draft'
        AND expires_at > NOW()
        AND (
          (scope = 'user' AND owner_user_id = ${userId})
          OR (scope = 'tenant' AND ${isAdmin})
        )
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  });

  return rows.map(mapMemory);
}
