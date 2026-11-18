/**
 * Busca server-side (SP-37): Postgres FTS (`simple`) + ILIKE parcial.
 * Tasks privadas filtradas por ator; queries parametrizadas (sem interpolação).
 */

import { withTenantSchema } from "../../core/database/prisma";
import { canViewTask } from "./agents.permissions";
import type { AgentsActor } from "./agents.types";

export type SearchHit = {
  id: string;
  entityType: "agent" | "task" | "project" | "goal" | "artifact";
  title: string;
  subtitle: string | null;
  status: string | null;
  kind: string | null;
};

export type AgentsSearchResult = {
  query: string;
  agents: SearchHit[];
  tasks: SearchHit[];
  projects: SearchHit[];
  goals: SearchHit[];
  artifacts: SearchHit[];
};

type AgentHitRow = {
  id: string;
  name: string;
  title: string | null;
  role: string;
  status: string;
};

type TaskHitRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: "open" | "private";
  createdByUserId: string;
};

type NamedHitRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  kind: string | null;
};

function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, "\\$&")}%`;
}

export async function searchAgentsEntities(
  schemaName: string,
  actor: AgentsActor,
  query: string,
  limitPerType: number,
): Promise<AgentsSearchResult> {
  const q = query.trim().slice(0, 100);
  if (!q) {
    return {
      query: "",
      agents: [],
      tasks: [],
      projects: [],
      goals: [],
      artifacts: [],
    };
  }

  const pattern = likePattern(q.toLowerCase());
  const take = Math.min(50, Math.max(1, limitPerType));

  return withTenantSchema(schemaName, async (tx) => {
    const agents = await tx.$queryRaw<AgentHitRow[]>`
      SELECT id, name, title, role, status
      FROM agents
      WHERE
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(title, '') || ' ' ||
          coalesce(role, '') || ' ' || coalesce(capabilities, '')
        ) @@ plainto_tsquery('simple', ${q})
        OR lower(name) LIKE ${pattern} ESCAPE '\'
        OR lower(coalesce(title, '')) LIKE ${pattern} ESCAPE '\'
        OR lower(role) LIKE ${pattern} ESCAPE '\'
      ORDER BY updated_at DESC
      LIMIT ${take}
    `;

    const taskRows = await tx.$queryRaw<TaskHitRow[]>`
      SELECT id, title, description, status, visibility,
        created_by_user_id AS "createdByUserId"
      FROM agent_tasks
      WHERE
        to_tsvector(
          'simple',
          coalesce(title, '') || ' ' || coalesce(description, '')
        ) @@ plainto_tsquery('simple', ${q})
        OR lower(title) LIKE ${pattern} ESCAPE '\'
        OR lower(coalesce(description, '')) LIKE ${pattern} ESCAPE '\'
      ORDER BY updated_at DESC
      LIMIT ${take * 2}
    `;

    const projects = await tx.$queryRaw<NamedHitRow[]>`
      SELECT id, name, description, status, NULL::text AS kind
      FROM agent_projects
      WHERE
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(description, '')
        ) @@ plainto_tsquery('simple', ${q})
        OR lower(name) LIKE ${pattern} ESCAPE '\'
        OR lower(coalesce(description, '')) LIKE ${pattern} ESCAPE '\'
      ORDER BY updated_at DESC
      LIMIT ${take}
    `;

    const goals = await tx.$queryRaw<NamedHitRow[]>`
      SELECT id, name, description, status, NULL::text AS kind
      FROM agent_goals
      WHERE
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(description, '')
        ) @@ plainto_tsquery('simple', ${q})
        OR lower(name) LIKE ${pattern} ESCAPE '\'
        OR lower(coalesce(description, '')) LIKE ${pattern} ESCAPE '\'
      ORDER BY updated_at DESC
      LIMIT ${take}
    `;

    const artifacts = await tx.$queryRaw<NamedHitRow[]>`
      SELECT id, name, content AS description, NULL::text AS status, kind
      FROM agent_artifacts
      WHERE
        to_tsvector(
          'simple',
          coalesce(name, '') || ' ' || coalesce(kind, '') || ' ' ||
          coalesce(content, '')
        ) @@ plainto_tsquery('simple', ${q})
        OR lower(name) LIKE ${pattern} ESCAPE '\'
        OR lower(kind) LIKE ${pattern} ESCAPE '\'
        OR lower(coalesce(content, '')) LIKE ${pattern} ESCAPE '\'
      ORDER BY updated_at DESC
      LIMIT ${take}
    `;

    const tasks = taskRows
      .filter((row) =>
        canViewTask(actor, {
          visibility: row.visibility,
          createdByUserId: row.createdByUserId,
        }),
      )
      .slice(0, take);

    return {
      query: q,
      agents: agents.map((row) => ({
        id: row.id,
        entityType: "agent" as const,
        title: row.name,
        subtitle: row.title || row.role,
        status: row.status,
        kind: null,
      })),
      tasks: tasks.map((row) => ({
        id: row.id,
        entityType: "task" as const,
        title: row.title,
        subtitle: row.description?.slice(0, 160) ?? null,
        status: row.status,
        kind: null,
      })),
      projects: projects.map((row) => ({
        id: row.id,
        entityType: "project" as const,
        title: row.name,
        subtitle: row.description?.slice(0, 160) ?? null,
        status: row.status,
        kind: null,
      })),
      goals: goals.map((row) => ({
        id: row.id,
        entityType: "goal" as const,
        title: row.name,
        subtitle: row.description?.slice(0, 160) ?? null,
        status: row.status,
        kind: null,
      })),
      artifacts: artifacts.map((row) => ({
        id: row.id,
        entityType: "artifact" as const,
        title: row.name,
        subtitle: row.description?.slice(0, 160) ?? null,
        status: null,
        kind: row.kind,
      })),
    };
  });
}
