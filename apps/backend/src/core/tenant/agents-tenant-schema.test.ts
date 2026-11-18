import { describe, expect, it } from "vitest";
import { buildAgentsTenantSchemaSQL } from "./agents-tenant-schema";

describe("tenant agents schema definition", () => {
  it("cria tabelas V1 nativas sem company_id Paperclip", () => {
    const statements = buildAgentsTenantSchemaSQL("tenant_acme");
    const sql = statements.join("\n");

    for (const table of [
      "agents",
      "agent_tasks",
      "agent_task_comments",
      "agent_runs",
      "agent_approvals",
      "agent_activity",
      "agent_skills",
      "agent_skill_attachments",
      "agent_connectors",
      "agent_secret_refs",
      "agent_tools",
      "agent_budgets",
      "agent_spend_events",
      "agent_connector_oauth_tokens",
      "agent_skill_versions",
      "agent_projects",
      "agent_routines",
      "agent_goals",
      "agent_artifacts",
    ]) {
      expect(sql).toContain(`"tenant_acme".${table}`);
    }

    expect(sql).not.toContain("company_id");
    expect(sql).not.toContain("paperclip_");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS");
    expect(sql).toContain("idx_agent_task_comments_idempotency");
    expect(sql).toContain("author_type = 'user' AND author_user_id IS NOT NULL");
    expect(sql).toContain("last_heartbeat_at");
    expect(sql).toContain("heartbeat_at");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS adapter_type");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS spend_cents");
    expect(sql).toContain("agent_spend_events_run_unique");
    expect(sql).toContain("reports_to_agent_id");
    expect(sql).toContain("idx_agents_fts");
    expect(sql).toContain("idx_agent_tasks_fts");
    expect(sql).toContain("USING GIN");
  });

  it("rejeita identificadores de schema inseguros", () => {
    expect(() =>
      buildAgentsTenantSchemaSQL('tenant"; DROP SCHEMA public;--'),
    ).toThrow("Nome de schema inválido");
  });

  it("ordena FKs: agents antes de tasks/runs/comments", () => {
    const statements = buildAgentsTenantSchemaSQL("tenant_x");
    const agentsIdx = statements.findIndex((s) =>
      s.includes(".agents (") && s.includes("CREATE TABLE"),
    );
    const tasksIdx = statements.findIndex((s) =>
      s.includes(".agent_tasks ("),
    );
    const commentsIdx = statements.findIndex((s) =>
      s.includes(".agent_task_comments ("),
    );
    const runsIdx = statements.findIndex((s) => s.includes(".agent_runs ("));

    expect(agentsIdx).toBeGreaterThanOrEqual(0);
    expect(tasksIdx).toBeGreaterThan(agentsIdx);
    expect(commentsIdx).toBeGreaterThan(tasksIdx);
    expect(runsIdx).toBeGreaterThan(tasksIdx);
  });
});
