import { Prisma } from "@prisma/client";
import { withTenantSchema } from "../../core/database/prisma";
import { AgentsModuleError } from "./agents.errors";
import { writeActivity } from "./agents.repository.shared";
import type { SkillAttachmentRecord } from "./agents.types";

type AttachmentRow = Omit<SkillAttachmentRecord, "createdAt"> & {
  createdAt: Date;
};

const ATTACH_COLS = Prisma.sql`
  id, skill_id AS "skillId", agent_id AS "agentId",
  created_at AS "createdAt"
`;

function mapAttachment(row: AttachmentRow): SkillAttachmentRecord {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function listSkillAttachments(
  schemaName: string,
  skillId: string,
): Promise<SkillAttachmentRecord[]> {
  const rows = await withTenantSchema(schemaName, (tx) =>
    tx.$queryRaw<AttachmentRow[]>`
      SELECT ${ATTACH_COLS} FROM agent_skill_attachments
      WHERE skill_id = ${skillId}::uuid
      ORDER BY created_at DESC
    `,
  );
  return rows.map(mapAttachment);
}

export async function attachSkill(
  schemaName: string,
  userId: string,
  skillId: string,
  agentId: string,
): Promise<SkillAttachmentRecord> {
  return withTenantSchema(schemaName, async (tx) => {
    const skill = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM agent_skills WHERE id = ${skillId}::uuid LIMIT 1
    `;
    if (!skill[0]) throw new AgentsModuleError(404, "Skill não encontrada.");
    const agent = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM agents WHERE id = ${agentId}::uuid LIMIT 1
    `;
    if (!agent[0]) throw new AgentsModuleError(404, "Agente não encontrado.");
    try {
      const rows = await tx.$queryRaw<AttachmentRow[]>`
        INSERT INTO agent_skill_attachments (skill_id, agent_id)
        VALUES (${skillId}::uuid, ${agentId}::uuid)
        RETURNING ${ATTACH_COLS}
      `;
      await writeActivity(tx, {
        actorType: "user",
        actorId: userId,
        action: "skill_attached",
        entityType: "skill",
        entityId: skillId,
        agentId,
      });
      return mapAttachment(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unique|duplicate/i.test(message)) {
        throw new AgentsModuleError(409, "Skill já anexada a este agente.");
      }
      throw error;
    }
  });
}

export async function detachSkill(
  schemaName: string,
  userId: string,
  skillId: string,
  agentId: string,
): Promise<void> {
  await withTenantSchema(schemaName, async (tx) => {
    const result = await tx.$executeRaw`
      DELETE FROM agent_skill_attachments
      WHERE skill_id = ${skillId}::uuid AND agent_id = ${agentId}::uuid
    `;
    if (Number(result) === 0) {
      throw new AgentsModuleError(404, "Anexo de skill não encontrado.");
    }
    await writeActivity(tx, {
      actorType: "user",
      actorId: userId,
      action: "skill_detached",
      entityType: "skill",
      entityId: skillId,
      agentId,
    });
  });
}
