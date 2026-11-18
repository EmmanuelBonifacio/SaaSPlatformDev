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

    // SP-39 — ledger de spend por run (idempotente via UNIQUE run_id)
    `ALTER TABLE ${s}.agent_runs
      ADD COLUMN IF NOT EXISTS spend_cents INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE ${s}.agent_runs
      ADD COLUMN IF NOT EXISTS input_tokens INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE ${s}.agent_runs
      ADD COLUMN IF NOT EXISTS output_tokens INTEGER NOT NULL DEFAULT 0`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_spend_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id UUID NOT NULL
        REFERENCES ${s}.agent_runs(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL
        REFERENCES ${s}.agents(id) ON DELETE CASCADE,
      task_id UUID
        REFERENCES ${s}.agent_tasks(id) ON DELETE SET NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0
        CONSTRAINT agent_spend_events_input_check CHECK (input_tokens >= 0),
      output_tokens INTEGER NOT NULL DEFAULT 0
        CONSTRAINT agent_spend_events_output_check CHECK (output_tokens >= 0),
      spend_cents INTEGER NOT NULL DEFAULT 0
        CONSTRAINT agent_spend_events_spend_check CHECK (spend_cents >= 0),
      provider VARCHAR(64),
      model VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_spend_events_run_unique UNIQUE (run_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_spend_events_agent_created
      ON ${s}.agent_spend_events (agent_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_spend_events_created
      ON ${s}.agent_spend_events (created_at DESC)`,

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

    // SP-40 — tokens OAuth MCP criptografados at-rest (nunca plaintext)
    `CREATE TABLE IF NOT EXISTS ${s}.agent_connector_oauth_tokens (
      connector_id UUID PRIMARY KEY
        REFERENCES ${s}.agent_connectors(id) ON DELETE CASCADE,
      access_token_enc TEXT NOT NULL,
      refresh_token_enc TEXT,
      token_type VARCHAR(64) NOT NULL DEFAULT 'Bearer',
      scope TEXT,
      expires_at TIMESTAMPTZ,
      last_refreshed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_connector_oauth_tokens_expires
      ON ${s}.agent_connector_oauth_tokens (expires_at)
      WHERE expires_at IS NOT NULL`,

    `ALTER TABLE ${s}.agents
      ADD COLUMN IF NOT EXISTS reports_to_agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL`,
    `CREATE INDEX IF NOT EXISTS idx_agents_reports_to
      ON ${s}.agents (reports_to_agent_id)
      WHERE reports_to_agent_id IS NOT NULL`,

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

    // SP-42 — dispatcher cron: assignee + last fire
    `ALTER TABLE ${s}.agent_routines
      ADD COLUMN IF NOT EXISTS assignee_agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL`,
    `ALTER TABLE ${s}.agent_routines
      ADD COLUMN IF NOT EXISTS last_fired_at TIMESTAMPTZ`,
    `ALTER TABLE ${s}.agent_routines
      ADD COLUMN IF NOT EXISTS last_fire_error VARCHAR(500)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_routines_active_cron
      ON ${s}.agent_routines (status, schedule_cron)
      WHERE status = 'active' AND schedule_cron IS NOT NULL`,

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

    // SP-41 — Cases + Workspaces (parity-lite)
    `CREATE TABLE IF NOT EXISTS ${s}.agent_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'open'
        CONSTRAINT agent_cases_status_check
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority VARCHAR(16) NOT NULL DEFAULT 'medium'
        CONSTRAINT agent_cases_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      project_id UUID
        REFERENCES ${s}.agent_projects(id) ON DELETE SET NULL,
      assignee_agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_cases_status_created
      ON ${s}.agent_cases (status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_cases_project
      ON ${s}.agent_cases (project_id) WHERE project_id IS NOT NULL`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'active'
        CONSTRAINT agent_workspaces_status_check
        CHECK (status IN ('active', 'paused', 'archived')),
      kind VARCHAR(32) NOT NULL DEFAULT 'execution'
        CONSTRAINT agent_workspaces_kind_check
        CHECK (kind IN ('execution', 'shared', 'personal')),
      project_id UUID
        REFERENCES ${s}.agent_projects(id) ON DELETE SET NULL,
      working_directory VARCHAR(500),
      uri VARCHAR(1000),
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_workspaces_status_created
      ON ${s}.agent_workspaces (status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_workspaces_project
      ON ${s}.agent_workspaces (project_id) WHERE project_id IS NOT NULL`,

    // SP-44 — anexos/receipts em comments
    `CREATE TABLE IF NOT EXISTS ${s}.agent_task_comment_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id UUID NOT NULL
        REFERENCES ${s}.agent_task_comments(id) ON DELETE CASCADE,
      kind VARCHAR(32) NOT NULL DEFAULT 'image'
        CONSTRAINT agent_comment_attachments_kind_check
        CHECK (kind IN ('image', 'file', 'receipt')),
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(128),
      size_bytes INTEGER
        CONSTRAINT agent_comment_attachments_size_check
        CHECK (size_bytes IS NULL OR (size_bytes >= 0 AND size_bytes <= 10485760)),
      storage_path VARCHAR(500),
      url_path VARCHAR(500),
      amount_cents INTEGER
        CONSTRAINT agent_comment_attachments_amount_check
        CHECK (amount_cents IS NULL OR amount_cents >= 0),
      currency VARCHAR(3),
      note VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_comment_attachments_comment
      ON ${s}.agent_task_comment_attachments (comment_id, created_at ASC)`,

    // SP-37 — GIN FTS (config simple; aditivo / IF NOT EXISTS)
    `CREATE INDEX IF NOT EXISTS idx_agents_fts
      ON ${s}.agents USING GIN (
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(title, '') || ' ' ||
          coalesce(role, '') || ' ' || coalesce(capabilities, '')
        )
      )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_tasks_fts
      ON ${s}.agent_tasks USING GIN (
        to_tsvector(
          'simple',
          coalesce(title, '') || ' ' || coalesce(description, '')
        )
      )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_projects_fts
      ON ${s}.agent_projects USING GIN (
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(description, '')
        )
      )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_goals_fts
      ON ${s}.agent_goals USING GIN (
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(description, '')
        )
      )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_artifacts_fts
      ON ${s}.agent_artifacts USING GIN (
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(kind, '') || ' ' ||
          coalesce(content, '')
        )
      )`,
  ];
}
