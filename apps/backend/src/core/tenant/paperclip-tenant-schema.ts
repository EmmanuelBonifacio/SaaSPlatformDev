export function buildPaperclipTenantSchemaSQL(schemaName: string): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS "${schemaName}".paperclip_settings (
      singleton_id SMALLINT PRIMARY KEY DEFAULT 1
        CONSTRAINT paperclip_settings_singleton_check CHECK (singleton_id = 1),
      company_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schemaName}".paperclip_conversations (
      id UUID PRIMARY KEY,
      owner_user_id VARCHAR(255) NOT NULL,
      client_request_id UUID NOT NULL,
      agent_id TEXT NOT NULL,
      issue_id TEXT UNIQUE,
      title VARCHAR(255) NOT NULL,
      initial_message TEXT NOT NULL,
      state VARCHAR(20) NOT NULL DEFAULT 'creating'
        CONSTRAINT paperclip_conversations_state_check
        CHECK (state IN ('creating', 'pending', 'active', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT paperclip_conversations_owner_request_unique
        UNIQUE (owner_user_id, client_request_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_paperclip_conversations_owner_created
      ON "${schemaName}".paperclip_conversations (owner_user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_paperclip_conversations_issue
      ON "${schemaName}".paperclip_conversations (issue_id)
      WHERE issue_id IS NOT NULL`,
  ];
}
