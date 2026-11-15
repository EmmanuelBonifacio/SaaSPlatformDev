const SAFE_SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

export function buildMemoryTenantSchemaSQL(schemaName: string): string[] {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new Error("Nome de schema inválido para as tabelas de memória.");
  }

  return [
    `CREATE TABLE IF NOT EXISTS "${schemaName}".agent_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id VARCHAR(255),
      scope VARCHAR(16) NOT NULL
        CONSTRAINT agent_memories_scope_check CHECK (scope IN ('user', 'tenant')),
      category VARCHAR(32) NOT NULL
        CONSTRAINT agent_memories_category_check
        CHECK (category IN ('preference', 'fact', 'decision', 'procedure', 'context')),
      title VARCHAR(160) NOT NULL,
      content TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'draft'
        CONSTRAINT agent_memories_status_check CHECK (status IN ('draft', 'approved')),
      source_type VARCHAR(24) NOT NULL
        CONSTRAINT agent_memories_source_check CHECK (source_type IN ('manual', 'conversation')),
      source_reference VARCHAR(240),
      created_by VARCHAR(255) NOT NULL,
      reviewed_by VARCHAR(255),
      approved_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_memories_owner_scope_check CHECK (
        (scope = 'user' AND owner_user_id IS NOT NULL) OR
        (scope = 'tenant' AND owner_user_id IS NULL)
      )
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_memories_owner_created
      ON "${schemaName}".agent_memories (owner_user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_memories_scope_status
      ON "${schemaName}".agent_memories (scope, status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_memories_expiry
      ON "${schemaName}".agent_memories (expires_at)
      WHERE status = 'draft'`,
    `CREATE INDEX IF NOT EXISTS idx_agent_memories_search
      ON "${schemaName}".agent_memories USING GIN (
        to_tsvector('simple', title || ' ' || content)
      )`,
    `CREATE TABLE IF NOT EXISTS "${schemaName}".agent_memory_settings (
      user_id VARCHAR(255) PRIMARY KEY,
      capture_suggestions BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schemaName}".agent_memory_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      memory_id UUID,
      actor_user_id VARCHAR(255) NOT NULL,
      scope VARCHAR(16) NOT NULL
        CONSTRAINT agent_memory_events_scope_check CHECK (scope IN ('user', 'tenant')),
      action VARCHAR(32) NOT NULL
        CONSTRAINT agent_memory_events_action_check CHECK (
          action IN (
            'candidate_created', 'candidate_approved', 'candidate_rejected',
            'candidate_expired', 'memory_deleted', 'capture_setting_changed'
          )
        ),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_memory_events_memory
      ON "${schemaName}".agent_memory_events (memory_id, created_at DESC)`,
  ];
}
