/**
 * DDL nativo do módulo de agentes (SP-7 fase 2).
 * Tabelas ficam em tenant_<slug> — sem company_id Paperclip.
 * Tabelas paperclip_* não são criadas aqui; drop só via script opt-in.
 */

import { buildAgentsExtrasTenantSchemaSQL } from "./agents-tenant-schema.extras";

const SAFE_SCHEMA_NAME = /^[a-z_][a-z0-9_]*$/;

export function buildAgentsTenantSchemaSQL(schemaName: string): string[] {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new Error("Nome de schema inválido para as tabelas de agentes.");
  }

  const s = `"${schemaName}"`;

  return [
    `CREATE TABLE IF NOT EXISTS ${s}.agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(160) NOT NULL,
      role VARCHAR(64) NOT NULL DEFAULT 'general',
      title VARCHAR(160),
      status VARCHAR(32) NOT NULL DEFAULT 'idle'
        CONSTRAINT agents_status_check
        CHECK (status IN ('idle', 'active', 'paused', 'error')),
      adapter_type VARCHAR(64) NOT NULL DEFAULT 'stub',
      capabilities TEXT,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by_user_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agents_status_created
      ON ${s}.agents (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'backlog'
        CONSTRAINT agent_tasks_status_check
        CHECK (status IN (
          'backlog', 'todo', 'in_progress', 'blocked', 'done', 'cancelled'
        )),
      priority VARCHAR(16) NOT NULL DEFAULT 'medium'
        CONSTRAINT agent_tasks_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      visibility VARCHAR(16) NOT NULL DEFAULT 'open'
        CONSTRAINT agent_tasks_visibility_check
        CHECK (visibility IN ('open', 'private')),
      assignee_agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL,
      created_by_user_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_updated
      ON ${s}.agent_tasks (status, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_tasks_assignee
      ON ${s}.agent_tasks (assignee_agent_id)
      WHERE assignee_agent_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_by
      ON ${s}.agent_tasks (created_by_user_id, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_task_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL
        REFERENCES ${s}.agent_tasks(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      author_type VARCHAR(16) NOT NULL DEFAULT 'user'
        CONSTRAINT agent_task_comments_author_type_check
        CHECK (author_type IN ('user', 'agent', 'system')),
      author_user_id VARCHAR(255),
      author_agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL,
      client_request_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT agent_task_comments_author_check CHECK (
        (author_type = 'user' AND author_user_id IS NOT NULL) OR
        (author_type = 'agent' AND author_agent_id IS NOT NULL) OR
        (author_type = 'system')
      )
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_task_comments_idempotency
      ON ${s}.agent_task_comments (task_id, client_request_id)
      WHERE client_request_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_agent_task_comments_task_created
      ON ${s}.agent_task_comments (task_id, created_at ASC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID NOT NULL
        REFERENCES ${s}.agents(id) ON DELETE RESTRICT,
      task_id UUID
        REFERENCES ${s}.agent_tasks(id) ON DELETE SET NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'queued'
        CONSTRAINT agent_runs_status_check
        CHECK (status IN (
          'queued', 'running', 'succeeded', 'failed', 'cancelled'
        )),
      requested_by_user_id VARCHAR(255) NOT NULL,
      error_message VARCHAR(500),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_created
      ON ${s}.agent_runs (agent_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_runs_status
      ON ${s}.agent_runs (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CONSTRAINT agent_approvals_status_check
        CHECK (status IN ('pending', 'approved', 'rejected')),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      related_task_id UUID
        REFERENCES ${s}.agent_tasks(id) ON DELETE SET NULL,
      related_run_id UUID
        REFERENCES ${s}.agent_runs(id) ON DELETE SET NULL,
      requested_by_user_id VARCHAR(255),
      requested_by_agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL,
      decided_by_user_id VARCHAR(255),
      decision_note TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_approvals_status_created
      ON ${s}.agent_approvals (status, created_at DESC)`,

    `CREATE TABLE IF NOT EXISTS ${s}.agent_activity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_type VARCHAR(16) NOT NULL DEFAULT 'system'
        CONSTRAINT agent_activity_actor_type_check
        CHECK (actor_type IN ('user', 'agent', 'system')),
      actor_id VARCHAR(255) NOT NULL,
      action VARCHAR(64) NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id VARCHAR(64) NOT NULL,
      agent_id UUID
        REFERENCES ${s}.agents(id) ON DELETE SET NULL,
      run_id UUID
        REFERENCES ${s}.agent_runs(id) ON DELETE SET NULL,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_activity_entity_created
      ON ${s}.agent_activity (entity_type, entity_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agent_activity_created
      ON ${s}.agent_activity (created_at DESC)`,

    ...buildAgentsExtrasTenantSchemaSQL(s),
  ];
}
