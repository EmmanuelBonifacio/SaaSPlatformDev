/**
 * DDL aditivo SP-27/SP-29: skills, connectors, colunas de runner/heartbeat.
 * Sem company_id Paperclip; sem DROP paperclip_*.
 */

export function buildAgentsExtrasTenantSchemaSQL(quotedSchema: string): string[] {
  const s = quotedSchema;
  return [
    `ALTER TABLE ${s}.agents
      ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ`,
    `ALTER TABLE ${s}.agent_runs
      ADD COLUMN IF NOT EXISTS adapter_type VARCHAR(64) NOT NULL DEFAULT 'stub'`,
    `ALTER TABLE ${s}.agent_runs
      ADD COLUMN IF NOT EXISTS summary TEXT`,
    `ALTER TABLE ${s}.agent_runs
      ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(160) NOT NULL,
      description TEXT,
      instructions TEXT NOT NULL DEFAULT '',
      status VARCHAR(32) NOT NULL DEFAULT 'active'
        CONSTRAINT agent_skills_status_check
        CHECK (status IN ('active', 'disabled')),
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_skills_slug_unique UNIQUE (slug)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_skills_status_created
      ON ${s}.agent_skills (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_skill_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      skill_id UUID NOT NULL
        REFERENCES ${s}.agent_skills(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL
        REFERENCES ${s}.agents(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_skill_attachments_unique UNIQUE (skill_id, agent_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_skill_attachments_agent
      ON ${s}.agent_skill_attachments (agent_id)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_connectors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(160) NOT NULL,
      kind VARCHAR(64) NOT NULL
        CONSTRAINT agent_connectors_kind_check
        CHECK (kind IN (
          'webhook', 'mcp', 'fleet_traccar', 'fleet_fleetbase',
          'fleet_fleetms', 'custom'
        )),
      status VARCHAR(32) NOT NULL DEFAULT 'disabled'
        CONSTRAINT agent_connectors_status_check
        CHECK (status IN ('enabled', 'disabled')),
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      secret_ref VARCHAR(128),
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_connectors_kind_status
      ON ${s}.agent_connectors (kind, status, created_at DESC)`,
  ];
}
