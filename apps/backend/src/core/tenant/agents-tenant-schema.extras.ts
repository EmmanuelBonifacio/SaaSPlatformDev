/**
 * DDL aditivo SP-27/SP-29/SP-30: skills, connectors, runner, AgentDetail.
 * Sem company_id Paperclip; sem DROP paperclip_*; secrets = refs de env.
 */

export function buildAgentsExtrasTenantSchemaSQL(quotedSchema: string): string[] {
  const s = quotedSchema;
  return [
    `ALTER TABLE ${s}.agents
      ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ`,
    `ALTER TABLE ${s}.agents
      ADD COLUMN IF NOT EXISTS instructions TEXT`,
    `ALTER TABLE ${s}.agents
      ADD COLUMN IF NOT EXISTS harness JSONB NOT NULL DEFAULT '{}'::jsonb`,
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

    `CREATE TABLE IF NOT EXISTS ${s}.agent_secret_refs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL
        REFERENCES ${s}.agents(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      env_ref VARCHAR(128) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_secret_refs_env_ref_format
        CHECK (env_ref ~ '^[A-Z][A-Z0-9_]*$'),
      CONSTRAINT agent_secret_refs_agent_name_unique UNIQUE (agent_id, name)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_secret_refs_agent
      ON ${s}.agent_secret_refs (agent_id, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_tools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL
        REFERENCES ${s}.agents(id) ON DELETE CASCADE,
      tool_key VARCHAR(64) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_tools_agent_key_unique UNIQUE (agent_id, tool_key)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_tools_agent
      ON ${s}.agent_tools (agent_id, enabled)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_budgets (
      agent_id UUID PRIMARY KEY
        REFERENCES ${s}.agents(id) ON DELETE CASCADE,
      period VARCHAR(16) NOT NULL DEFAULT 'month'
        CONSTRAINT agent_budgets_period_check
        CHECK (period IN ('day', 'week', 'month')),
      soft_limit_cents INTEGER
        CONSTRAINT agent_budgets_soft_check CHECK (
          soft_limit_cents IS NULL OR soft_limit_cents >= 0
        ),
      hard_limit_cents INTEGER
        CONSTRAINT agent_budgets_hard_check CHECK (
          hard_limit_cents IS NULL OR hard_limit_cents >= 0
        ),
      spent_cents INTEGER NOT NULL DEFAULT 0
        CONSTRAINT agent_budgets_spent_check CHECK (spent_cents >= 0),
      alert_threshold_pct INTEGER NOT NULL DEFAULT 80
        CONSTRAINT agent_budgets_alert_check
        CHECK (alert_threshold_pct BETWEEN 1 AND 100),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_skill_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      skill_id UUID NOT NULL
        REFERENCES ${s}.agent_skills(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      changelog TEXT,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_skill_versions_unique UNIQUE (skill_id, version)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_skill_versions_skill
      ON ${s}.agent_skill_versions (skill_id, version DESC)`,

    `ALTER TABLE ${s}.agent_connectors
      ADD COLUMN IF NOT EXISTS oauth_status VARCHAR(32) NOT NULL DEFAULT 'disconnected'`,
    `ALTER TABLE ${s}.agent_connectors
      ADD COLUMN IF NOT EXISTS oauth_client_id_ref VARCHAR(128)`,
    `ALTER TABLE ${s}.agent_connectors
      ADD COLUMN IF NOT EXISTS oauth_client_secret_ref VARCHAR(128)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'active'
        CONSTRAINT agent_projects_status_check
        CHECK (status IN ('active', 'paused', 'archived')),
      starred BOOLEAN NOT NULL DEFAULT false,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_projects_status_created
      ON ${s}.agent_projects (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_routines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      schedule_cron VARCHAR(120),
      status VARCHAR(32) NOT NULL DEFAULT 'active'
        CONSTRAINT agent_routines_status_check
        CHECK (status IN ('active', 'paused', 'archived')),
      project_id UUID
        REFERENCES ${s}.agent_projects(id) ON DELETE SET NULL,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_routines_status_created
      ON ${s}.agent_routines (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'open'
        CONSTRAINT agent_goals_status_check
        CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
      project_id UUID
        REFERENCES ${s}.agent_projects(id) ON DELETE SET NULL,
      target_date DATE,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_goals_status_created
      ON ${s}.agent_goals (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_artifacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      kind VARCHAR(64) NOT NULL DEFAULT 'note'
        CONSTRAINT agent_artifacts_kind_check
        CHECK (kind IN ('note', 'file', 'link', 'plan', 'output')),
      content TEXT,
      uri VARCHAR(1000),
      task_id UUID
        REFERENCES ${s}.agent_tasks(id) ON DELETE SET NULL,
      project_id UUID
        REFERENCES ${s}.agent_projects(id) ON DELETE SET NULL,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_artifacts_created
      ON ${s}.agent_artifacts (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_artifacts_task
      ON ${s}.agent_artifacts (task_id) WHERE task_id IS NOT NULL`,
  ];
}
