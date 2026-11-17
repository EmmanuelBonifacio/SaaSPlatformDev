import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type { PublishSkillVersionDto } from "./agents.schema";
import type { SkillRecord, SkillVersionRecord } from "./agents.types";

type VersionRow = {
  id: string;
  skillId: string;
  version: number;
  instructions: string;
  changelog: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

function mapVersion(row: VersionRow): SkillVersionRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listSkillVersions(
  schemaName: string,
  skillId: string,
): Promise<SkillVersionRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<VersionRow[]>`
      SELECT id, skill_id AS "skillId", version, instructions, changelog,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt"
      FROM agent_skill_versions
      WHERE skill_id = ${skillId}::uuid
      ORDER BY version DESC
      LIMIT 50
    `,
  );
  return rows.map(mapVersion);
}

export async function publishSkillVersion(
  schemaName: string,
  userId: string,
  skillId: string,
  input: PublishSkillVersionDto,
): Promise<{ skill: SkillRecord; version: SkillVersionRecord }> {
  return withTenantSchema(schemaName, async (tx) => {
    const skills = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        instructions: string;
        status: SkillRecord["status"];
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT id, name, slug, description, instructions, status,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_skills WHERE id = ${skillId}::uuid LIMIT 1
    `;
    if (!skills[0]) throw new AgentsModuleError(404, "Skill não encontrada.");

    const instructions =
      input.instructions?.trim() || skills[0].instructions || "";
    if (input.instructions !== undefined) {
      await tx.$executeRaw`
        UPDATE agent_skills
        SET instructions = ${instructions}, updated_at = NOW()
        WHERE id = ${skillId}::uuid
      `;
    }

    const next = await tx.$queryRaw<Array<{ version: number }>>`
      SELECT COALESCE(MAX(version), 0) + 1 AS version
      FROM agent_skill_versions WHERE skill_id = ${skillId}::uuid
    `;
    const versionNum = next[0]?.version ?? 1;
    const versionRows = await tx.$queryRaw<VersionRow[]>`
      INSERT INTO agent_skill_versions (
        skill_id, version, instructions, changelog, created_by_user_id
      ) VALUES (
        ${skillId}::uuid, ${versionNum}, ${instructions},
        ${input.changelog ?? null}, ${userId}
      )
      RETURNING id, skill_id AS "skillId", version, instructions, changelog,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt"
    `;
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "skill_version_published",
      entityType: "skill",
      entityId: skillId,
    });
    const updated = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        instructions: string;
        status: SkillRecord["status"];
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT id, name, slug, description, instructions, status,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM agent_skills WHERE id = ${skillId}::uuid LIMIT 1
    `;
    const skillRow = updated[0];
    return {
      skill: {
        ...skillRow,
        createdAt: skillRow.createdAt.toISOString(),
        updatedAt: skillRow.updatedAt.toISOString(),
      },
      version: mapVersion(versionRows[0]),
    };
  });
}

export async function restoreSkillVersion(
  schemaName: string,
  userId: string,
  skillId: string,
  versionId: string,
): Promise<SkillRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const versions = await tx.$queryRaw<VersionRow[]>`
      SELECT id, skill_id AS "skillId", version, instructions, changelog,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt"
      FROM agent_skill_versions
      WHERE id = ${versionId}::uuid AND skill_id = ${skillId}::uuid
      LIMIT 1
    `;
    if (!versions[0]) {
      throw new AgentsModuleError(404, "Versão de skill não encontrada.");
    }
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        instructions: string;
        status: SkillRecord["status"];
        createdByUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      UPDATE agent_skills SET
        instructions = ${versions[0].instructions},
        updated_at = NOW()
      WHERE id = ${skillId}::uuid
      RETURNING id, name, slug, description, instructions, status,
        created_by_user_id AS "createdByUserId",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    if (!rows[0]) throw new AgentsModuleError(404, "Skill não encontrada.");
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "skill_version_restored",
      entityType: "skill",
      entityId: skillId,
    });
    return {
      ...rows[0],
      createdAt: rows[0].createdAt.toISOString(),
      updatedAt: rows[0].updatedAt.toISOString(),
    };
  });
}
