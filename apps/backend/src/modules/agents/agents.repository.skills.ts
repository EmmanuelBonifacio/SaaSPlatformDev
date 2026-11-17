import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type { CreateSkillDto, UpdateSkillDto } from "./agents.schema";
import type { SkillRecord } from "./agents.types";

export {
  attachSkill,
  detachSkill,
  listSkillAttachments,
} from "./agents.repository.skill-attachments";

type SkillRow = Omit<SkillRecord, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

const SKILL_COLS = Prisma.sql`
  id, name, slug, description, instructions, status,
  created_by_user_id AS "createdByUserId",
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

function mapSkill(row: SkillRow): SkillRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function slugifySkillName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return slug || "skill";
}

export async function listSkills(
  schemaName: string,
  limit: number,
  offset: number,
): Promise<SkillRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<SkillRow[]>`
      SELECT ${SKILL_COLS} FROM agent_skills
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  );
  return rows.map(mapSkill);
}

export async function getSkill(
  schemaName: string,
  skillId: string,
): Promise<SkillRecord | null> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<SkillRow[]>`
      SELECT ${SKILL_COLS} FROM agent_skills
      WHERE id = ${skillId}::uuid LIMIT 1
    `,
  );
  return rows[0] ? mapSkill(rows[0]) : null;
}

export async function createSkill(
  schemaName: string,
  userId: string,
  input: CreateSkillDto,
): Promise<SkillRecord> {
  const slug = input.slug?.trim() || slugifySkillName(input.name);
  return withTenantSchema(schemaName, async (tx) => {
    try {
      const rows = await tx.$queryRaw<SkillRow[]>`
        INSERT INTO agent_skills (
          name, slug, description, instructions, status, created_by_user_id
        ) VALUES (
          ${input.name}, ${slug}, ${input.description ?? null},
          ${input.instructions ?? ""}, ${input.status ?? "active"}, ${userId}
        )
        RETURNING ${SKILL_COLS}
      `;
      const skill = mapSkill(rows[0]);
      await writeActivity(tx, {
        actorType: "user",
        actorId: userId,
        action: "skill_created",
        entityType: "skill",
        entityId: skill.id,
      });
      return skill;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unique|duplicate/i.test(message)) {
        throw new AgentsModuleError(409, "Slug de skill já existe.");
      }
      throw error;
    }
  });
}

export async function updateSkill(
  schemaName: string,
  userId: string,
  skillId: string,
  input: UpdateSkillDto,
): Promise<SkillRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const current = await tx.$queryRaw<SkillRow[]>`
      SELECT ${SKILL_COLS} FROM agent_skills
      WHERE id = ${skillId}::uuid LIMIT 1
    `;
    if (!current[0]) {
      throw new AgentsModuleError(404, "Skill não encontrada.");
    }
    const next = {
      name: input.name ?? current[0].name,
      slug: input.slug ?? current[0].slug,
      description:
        input.description !== undefined
          ? input.description
          : current[0].description,
      instructions: input.instructions ?? current[0].instructions,
      status: input.status ?? current[0].status,
    };
    const rows = await tx.$queryRaw<SkillRow[]>`
      UPDATE agent_skills SET
        name = ${next.name},
        slug = ${next.slug},
        description = ${next.description},
        instructions = ${next.instructions},
        status = ${next.status},
        updated_at = NOW()
      WHERE id = ${skillId}::uuid
      RETURNING ${SKILL_COLS}
    `;
    const skill = mapSkill(rows[0]);
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "skill_updated",
      entityType: "skill",
      entityId: skill.id,
    });
    return skill;
  });
}
